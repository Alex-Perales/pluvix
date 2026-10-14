import { useCallback, useEffect, useState } from 'react';
import { PERU_STATIONS, WeatherStation, riskFor, UMBRAL_ROJO_MM } from './stations';

// Lluvia real de Open-Meteo (API gratuita, sin clave) para cada estación.
// Si la consulta falla, la página avisa que no hay conexión en vez de mostrar números.

// Dirección de las funciones de noticias. En local la atiende el servidor de Vite (/api);
// al publicar en AWS se define VITE_API_URL con la URL de API Gateway.
export const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export type LiveStatus = 'cargando' | 'en-vivo' | 'sin-conexion';

const REFRESH_MS = 15 * 60 * 1000;

interface RainResponse {
  current: { time: string };
  hourly: { precipitation: (number | null)[] };
}

const coords = () =>
  `latitude=${PERU_STATIONS.map((s) => s.lat).join(',')}&longitude=${PERU_STATIONS.map((s) => s.lng).join(',')}`;

async function fetchLiveStations(): Promise<WeatherStation[]> {
  const rainRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?${coords()}&current=precipitation&hourly=precipitation&past_hours=24&forecast_hours=0&timezone=GMT`
  );
  if (!rainRes.ok) throw new Error(`Open-Meteo respondió ${rainRes.status}`);

  const rain = (await rainRes.json()) as RainResponse[];

  return PERU_STATIONS.map((station, i) => {
    const mm = rain[i].hourly.precipitation.reduce<number>((sum, v) => sum + (v ?? 0), 0);
    const measuredAt = new Date(`${rain[i].current.time}Z`).getTime();

    return {
      ...station,
      precipitationMm: Math.round(mm * 10) / 10,
      riskLevel: riskFor(mm),
      thresholdRedMm: UMBRAL_ROJO_MM,
      updatedMinutesAgo: Math.max(0, Math.round((Date.now() - measuredAt) / 60000)),
    };
  });
}

export function useLiveStations() {
  const [stations, setStations] = useState<WeatherStation[]>(PERU_STATIONS);
  const [status, setStatus] = useState<LiveStatus>('cargando');

  const reload = useCallback(async () => {
    try {
      setStations(await fetchLiveStations());
      setStatus('en-vivo');
    } catch {
      // Conserva lo último que se mostró; solo avisa si nunca hubo datos reales
      setStatus((prev) => (prev === 'en-vivo' ? prev : 'sin-conexion'));
    }
  }, []);

  useEffect(() => {
    void reload();
    const timer = setInterval(() => void reload(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [reload]);

  return { stations, status, reload };
}

// ---------------------------------------------------------------------------
// Lluvia diaria: historial de 30 días y pronóstico
// ---------------------------------------------------------------------------

// Lluvia diaria real de cada estación (Open-Meteo): los últimos 30 días para el historial
// y hoy + 3 días de pronóstico para la vigilancia y los avisos preventivos.

export interface DayRain {
  date: string; // AAAA-MM-DD
  mm: number;
}

export interface StationOutlook {
  past: DayRain[];
  forecast: DayRain[];
}

export type OutlookStatus = 'cargando' | 'listo' | 'error';

const PAST_DAYS = 30;

interface DailyResponse {
  daily: { time: string[]; precipitation_sum: (number | null)[] };
}

export function useRainOutlook() {
  const [outlook, setOutlook] = useState<Record<string, StationOutlook>>({});
  const [status, setStatus] = useState<OutlookStatus>('cargando');

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast' +
          `?latitude=${PERU_STATIONS.map((s) => s.lat).join(',')}` +
          `&longitude=${PERU_STATIONS.map((s) => s.lng).join(',')}` +
          `&daily=precipitation_sum&past_days=${PAST_DAYS}&forecast_days=4&timezone=America%2FLima`
      );
      if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
      const data = (await res.json()) as DailyResponse[];

      const next: Record<string, StationOutlook> = {};
      PERU_STATIONS.forEach((station, i) => {
        const days = data[i].daily.time.map((date, d) => ({
          date,
          mm: data[i].daily.precipitation_sum[d] ?? 0,
        }));
        next[station.id] = { past: days.slice(0, PAST_DAYS), forecast: days.slice(PAST_DAYS) };
      });
      setOutlook(next);
      setStatus('listo');
    } catch {
      // Conserva lo último que se mostró; solo marca error si nunca hubo datos
      setStatus((prev) => (prev === 'listo' ? prev : 'error'));
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  return { outlook, status, reload: load };
}
