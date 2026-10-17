import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { RiskLevel, WeatherStation, UMBRAL_ROJO_MM, UMBRAL_NARANJA_MM, RISK_COLOR } from '../data/stations';
import { OutlookStatus, StationOutlook } from '../data/weather';
import { ChartSkeleton, LoadingNote } from './ui';

// Vigilancia de lluvias: un solo gráfico grande para el departamento elegido,
// con los últimos 7 días, hoy y los próximos 3, y los umbrales de alerta dibujados.

interface RainChartProps {
  stations: WeatherStation[];
  outlook: Record<string, StationOutlook>;
  outlookStatus: OutlookStatus;
  isLive: boolean;
  onViewStationOnMap: (station: WeatherStation) => void;
}

const PAST_DAYS_SHOWN = 7;

const RISK_UI: Record<RiskLevel, { label: string; color: string }> = {
  ALTO: { label: 'Peligro', color: RISK_COLOR.ALTO },
  MEDIO: { label: 'Precaución', color: RISK_COLOR.MEDIO },
  BAJO: { label: 'Normal', color: RISK_COLOR.BAJO },
};

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const dayName = (iso: string) => {
  const d = new Date(`${iso}T12:00`);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}`;
};

export const RainChart: React.FC<RainChartProps> = ({
  stations,
  outlook,
  outlookStatus,
  isLive,
  onViewStationOnMap,
}) => {
  const ranking = [...stations].sort((a, b) => b.precipitationMm - a.precipitationMm);
  // Por defecto se muestra el departamento con más lluvia
  const [chosenId, setChosenId] = useState<string | null>(null);
  const station = stations.find((s) => s.id === chosenId) ?? ranking[0];

  const data = outlook[station.id];
  const days = data
    ? [
        ...data.past.slice(-PAST_DAYS_SHOWN).map((d) => ({ ...d, kind: 'pasado' as const })),
        ...data.forecast.map((d, i) => ({ ...d, kind: i === 0 ? ('hoy' as const) : ('pronostico' as const) })),
      ]
    : [];
  const scale = Math.max(UMBRAL_ROJO_MM * 1.2, ...days.map((d) => d.mm * 1.15));
  const pct = (mm: number) => `${(mm / scale) * 100}%`;
  const risk = RISK_UI[station.riskLevel];

  return (
    <div className="bg-[#E2E8F0] rounded-2xl border border-[#BBDEFB] shadow-xs overflow-hidden">
      {/* Selector y datos clave */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 p-5 sm:p-6 border-b border-[#E3F2FD]">
        <label className="flex items-center gap-2 shrink-0">
          <MapPin className="w-6 h-6 text-[#1565C0]" />
          <span className="sr-only">Elegir departamento</span>
          <select
            value={station.id}
            onChange={(e) => setChosenId(e.target.value)}
            className="py-2 pl-3 pr-8 rounded-lg border border-[#90CAF9] bg-white text-lg font-bold text-[#111827] focus:outline-none focus:border-[#1565C0] cursor-pointer"
          >
            {(['Costa', 'Sierra', 'Selva'] as const).map((zone) => (
              <optgroup key={zone} label={zone}>
                {stations
                  .filter((s) => s.region === zone)
                  .sort((a, b) => a.department.localeCompare(b.department, 'es'))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.department}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 flex-1">
          <div>
            <span className="block text-xs text-[#1565C0]">Lluvia en 24 h</span>
            <strong className="text-2xl text-[#111827]">{isLive ? `${station.precipitationMm.toFixed(1)} mm` : '—'}</strong>
          </div>
          <div>
            <span className="block text-xs text-[#1565C0]">Nivel</span>
            <span className="inline-flex items-center gap-1.5 text-lg font-bold text-[#111827]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isLive ? risk.color : '#9CA3AF' }} />
              {isLive ? risk.label : '—'}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-xs text-[#1565C0]">Estación</span>
            <span className="block text-sm text-[#111827] truncate">{station.name}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onViewStationOnMap(station)}
          className="self-start lg:self-auto px-4 py-2 rounded-lg border border-[#90CAF9] bg-white hover:bg-[#E3F2FD] text-[#1565C0] text-sm font-semibold cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <MapPin className="w-4 h-4" />
          Ver en el mapa
        </button>
      </div>

      {/* Gráfico de barras: 7 días anteriores, hoy y 3 de pronóstico */}
      <div className="px-3 sm:px-6 pt-6 pb-4">
        {days.length === 0 ? (
          outlookStatus === 'error' ? (
            <p className="h-72 flex items-center justify-center text-sm text-[#111827] text-center px-4" role="alert">
              No se pudo cargar la lluvia diaria. Use el botón «Actualizar» de arriba para reintentar.
            </p>
          ) : (
            <>
              <ChartSkeleton />
              <div className="mt-4 text-center">
                <LoadingNote>Cargando la lluvia de los últimos días…</LoadingNote>
              </div>
            </>
          )
        ) : (
          <>
            <div className="relative h-72 ml-8 sm:ml-10">
              {/* Umbrales de alerta */}
              {[
                { mm: UMBRAL_NARANJA_MM, color: RISK_COLOR.MEDIO },
                { mm: UMBRAL_ROJO_MM, color: RISK_COLOR.ALTO },
              ].map(({ mm, color }) => (
                <div key={mm} className="absolute left-0 right-0 border-t-2 border-dashed" style={{ bottom: pct(mm), borderColor: color }}>
                  <span className="absolute -left-8 sm:-left-10 -translate-y-1/2 text-xs font-bold text-[#111827]">{mm}</span>
                </div>
              ))}
              <div className="absolute left-0 right-0 bottom-0 border-t border-[#90CAF9]" />

              {/* Barras */}
              <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-2.5">
                {days.map((d) => (
                  <div key={d.date} className="flex-1 h-full flex flex-col justify-end items-center min-w-0">
                    <span className={`mb-1 text-xs ${d.kind === 'hoy' ? 'font-bold' : ''} text-[#111827]`}>{d.mm.toFixed(1)}</span>
                    <div
                      className="w-full rounded-t-md"
                      style={{
                        height: `max(3px, ${pct(d.mm)})`,
                        backgroundColor: d.kind === 'pronostico' ? '#90CAF9' : '#1565C0',
                        outline: d.kind === 'hoy' ? '3px solid #111827' : undefined,
                        outlineOffset: d.kind === 'hoy' ? '2px' : undefined,
                      }}
                      title={`${dayName(d.date)}: ${d.mm.toFixed(1)} mm`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Días */}
            <div className="flex gap-1.5 sm:gap-2.5 ml-8 sm:ml-10 mt-2">
              {days.map((d) => (
                <span
                  key={d.date}
                  className={`flex-1 min-w-0 text-center text-xs capitalize text-[#111827] ${d.kind === 'hoy' ? 'font-bold' : ''}`}
                >
                  {d.kind === 'hoy' ? (
                    'Hoy'
                  ) : (
                    <>
                      {/* En celular solo el número del día, para que no se amontone */}
                      <span className="hidden sm:inline">{dayName(d.date)}</span>
                      <span className="sm:hidden">{new Date(`${d.date}T12:00`).getDate()}</span>
                    </>
                  )}
                </span>
              ))}
            </div>

            {/* Leyenda */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#111827]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#1565C0]" /> Lluvia medida (mm)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#90CAF9]" /> Pronóstico
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 border-t-2 border-dashed border-[#F59E0B]" /> Precaución ({UMBRAL_NARANJA_MM} mm)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-5 border-t-2 border-dashed border-[#EF4444]" /> Peligro ({UMBRAL_ROJO_MM} mm)
              </span>
            </div>
          </>
        )}
      </div>

      {/* Vista general: los 5 departamentos con más lluvia hoy */}
      {isLive && (
        <div className="px-5 sm:px-6 py-4 border-t border-[#E3F2FD] bg-[#F1F5F9]">
          <span className="block text-sm font-bold text-[#111827] mb-2">Más lluvia hoy</span>
          <div className="flex flex-wrap gap-2">
            {ranking.slice(0, 5).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setChosenId(s.id)}
                aria-pressed={s.id === station.id}
                className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer inline-flex items-center gap-2 transition-colors ${
                  s.id === station.id
                    ? 'bg-[#1565C0] border-[#1565C0] text-white'
                    : 'bg-white border-[#BBDEFB] text-[#111827] hover:bg-[#E3F2FD]'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RISK_UI[s.riskLevel].color }} />
                <span className="font-semibold">{s.department}</span>
                <span className={s.id === station.id ? 'text-white/90' : 'text-[#1565C0]'}>{s.precipitationMm.toFixed(1)} mm</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
