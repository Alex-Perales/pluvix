import React, { useMemo, useState } from 'react';
import { Download, Search, ArrowUpRight, CloudRain, MapPin, RefreshCw, ShieldCheck, X, CheckCircle2 } from 'lucide-react';
import { AlertIcon, Bone, ErrorNote, LoadingNote } from '../components/ui';
import { ActiveAlert, HistoricalAlert, NaturalRegion, RiskLevel, WeatherStation, riskFor, UMBRAL_ROJO_MM, UMBRAL_NARANJA_MM, RISK_COLOR } from '../data/stations';
import { LiveStatus, useRainOutlook } from '../data/weather';
import { RainChart } from '../components/RainChart';

interface AlertasPageProps {
  stations: WeatherStation[];
  dataStatus: LiveStatus;
  onRefreshStations: () => Promise<void>;
  onViewStationOnMap: (station: WeatherStation) => void;
}


const STATUS_COUNTERS: { level: RiskLevel; label: string; short: string }[] = [
  { level: 'ALTO', label: 'Peligro', short: 'Peligro' },
  { level: 'MEDIO', label: 'Precaución', short: 'Precaución' },
  { level: 'BAJO', label: 'Normal', short: 'Normal' },
];

const LEVEL_STYLES: Record<RiskLevel, { color: string; label: string; chip: string }> = {
  ALTO: { color: RISK_COLOR.ALTO, label: 'Peligro', chip: 'bg-white text-[#111827] border-[#BBDEFB]' },
  MEDIO: { color: RISK_COLOR.MEDIO, label: 'Precaución', chip: 'bg-white text-[#111827] border-[#BBDEFB]' },
  BAJO: { color: RISK_COLOR.BAJO, label: 'Normal', chip: 'bg-white text-[#111827] border-[#BBDEFB]' },
};


// Recomendaciones generales de Defensa Civil según el nivel de la alerta
const PROTOCOL_STEPS: Record<'ALTO' | 'MEDIO', string[]> = {
  ALTO: [
    'Aléjese de ríos, quebradas y badenes; no intente cruzarlos a pie ni en vehículo.',
    'Si vive en una zona baja o junto a un cauce, evacúe hacia la zona segura indicada por su municipalidad.',
    'Tenga lista su mochila de emergencia y siga las indicaciones de Defensa Civil (línea 115).',
  ],
  MEDIO: [
    'Manténgase atento a los avisos y evite permanecer cerca de quebradas y cauces secos.',
    'Revise techos, canaletas y drenajes de su vivienda, y proteja sus documentos.',
    'Ubique la zona segura y la ruta de evacuación de su localidad por si la lluvia aumenta.',
  ],
};

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const toDate = (iso: string) => new Date(`${iso}T12:00`);
const shortDate = (iso: string) => {
  const d = toDate(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const longDay = (iso: string, index: number) =>
  index === 0 ? 'hoy' : index === 1 ? 'mañana' : `el ${WEEKDAYS[toDate(iso).getDay()]} ${toDate(iso).getDate()}`;

export const AlertasPage: React.FC<AlertasPageProps> = ({
  stations,
  dataStatus,
  onRefreshStations,
  onViewStationOnMap,
}) => {
  const { outlook, status: outlookStatus, reload } = useRainOutlook();
  const [refreshing, setRefreshing] = useState(false);
  // Alerta abierta en la ventana «Ver qué hacer»
  const [modalAlert, setModalAlert] = useState<ActiveAlert | null>(null);

  const [historySearch, setHistorySearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<'Todas' | NaturalRegion>('Todas');
  const [riskFilter, setRiskFilter] = useState<'Todos' | RiskLevel>('Todos');

  const isLive = dataStatus === 'en-vivo';

  // 1. Alertas activas: estaciones cuya lluvia de las últimas 24 h supera un umbral
  const activeAlerts = useMemo<ActiveAlert[]>(() => {
    if (!isLive) return [];
    return stations
      .filter((s) => s.riskLevel !== 'BAJO')
      .sort((a, b) => b.precipitationMm - a.precipitationMm)
      .map((s) => {
        const red = s.riskLevel === 'ALTO';
        const threshold = red ? UMBRAL_ROJO_MM : UMBRAL_NARANJA_MM;
        return {
          id: `alerta-${s.id}`,
          code: s.name,
          title: red
            ? `Peligro: lluvias intensas en ${s.department}`
            : `Precaución: lluvias moderadas en ${s.department}`,
          department: s.department,
          provinces: [s.province],
          region: s.region,
          severity: red ? 'ROJA' : 'NARANJA',
          riskLevel: s.riskLevel,
          issuedAt: `Hoy, hace ${s.updatedMinutesAgo} min`,
          validUntil: 'se reevalúa cada 15 min',
          expectedRainfall: `${s.precipitationMm.toFixed(1)} mm en 24 h`,
          riverBasin: s.basin,
          description: red
            ? `La estación registra ${s.precipitationMm.toFixed(1)} mm de lluvia acumulada en las últimas 24 horas, por encima del umbral de alerta roja (${threshold} mm). Hay riesgo de activación de quebradas y desbordes en la ${s.basin}.`
            : `La estación registra ${s.precipitationMm.toFixed(1)} mm de lluvia acumulada en las últimas 24 horas, por encima del umbral de vigilancia (${threshold} mm). Se mantiene la observación de quebradas y cauces en la ${s.basin}.`,
          protocolSteps: PROTOCOL_STEPS[red ? 'ALTO' : 'MEDIO'],
          evacuationCenters: 0,
        };
      });
  }, [stations, isLive]);

  // 2. Avisos por pronóstico: el día más lluvioso entre hoy y los próximos 3, si supera el umbral
  const forecastNotices = useMemo(() => {
    return stations
      .map((station) => {
        const days = outlook[station.id]?.forecast ?? [];
        const peak = days.reduce<{ date: string; mm: number; index: number } | null>(
          (best, day, index) => (!best || day.mm > best.mm ? { ...day, index } : best),
          null
        );
        return peak && peak.mm >= UMBRAL_NARANJA_MM ? { station, ...peak, level: riskFor(peak.mm) } : null;
      })
      .filter((n): n is NonNullable<typeof n> => n !== null)
      .sort((a, b) => b.mm - a.mm);
  }, [stations, outlook]);

  // 4. Historial: cada día de los últimos 30 en que una estación superó los 15 mm
  const history = useMemo<(HistoricalAlert & { sortKey: string })[]>(() => {
    return stations
      .flatMap((s) =>
        (outlook[s.id]?.past ?? [])
          .filter((day) => day.mm >= UMBRAL_NARANJA_MM)
          .map((day) => ({
            id: `${s.id}-${day.date}`,
            sortKey: day.date,
            date: shortDate(day.date),
            region: s.department,
            naturalRegion: s.region,
            alertType: day.mm > UMBRAL_ROJO_MM ? 'Lluvia intensa' : 'Lluvia moderada',
            riskLevel: riskFor(day.mm),
            recordedMm: `${day.mm.toFixed(1)} mm`,
            station: s.name,
          }))
      )
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey) || parseFloat(b.recordedMm) - parseFloat(a.recordedMm));
  }, [stations, outlook]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchRegion = regionFilter === 'Todas' || item.naturalRegion === regionFilter;
      const matchRisk = riskFilter === 'Todos' || item.riskLevel === riskFilter;
      const q = historySearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.region.toLowerCase().includes(q) ||
        item.station.toLowerCase().includes(q) ||
        item.alertType.toLowerCase().includes(q) ||
        item.date.toLowerCase().includes(q);
      return matchRegion && matchRisk && matchSearch;
    });
  }, [history, historySearch, regionFilter, riskFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([reload(), onRefreshStations()]);
    setRefreshing(false);
  };

  const handleExportCsv = () => {
    const headers = ['Fecha', 'Region', 'Region Natural', 'Estacion', 'Tipo de Evento', 'Lluvia del dia', 'Nivel'];
    const rows = filteredHistory.map((r) => [
      `"${r.date}"`,
      `"${r.region}"`,
      `"${r.naturalRegion}"`,
      `"${r.station}"`,
      `"${r.alertType}"`,
      `"${r.recordedMm}"`,
      `"${r.riskLevel}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'historial_lluvias_peru.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const levelCounts: Record<RiskLevel, number> = {
    ALTO: stations.filter((st) => st.riskLevel === 'ALTO').length,
    MEDIO: stations.filter((st) => st.riskLevel === 'MEDIO').length,
    BAJO: stations.filter((st) => st.riskLevel === 'BAJO').length,
  };

  return (
    <div className="w-full bg-white">
      {/* Encabezado de la página */}
      <section className="max-w-[1320px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Centro de Alertas</h1>
            <p className="text-sm text-[#111827] mt-1">{isLive
                ? `${activeAlerts.length} ${activeAlerts.length === 1 ? 'alerta activa' : 'alertas activas'} · ${stations.length} estaciones bajo vigilancia`
                : 'Vigilancia de lluvias en las estaciones del país'}</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#90CAF9] text-[#1565C0] font-semibold hover:bg-[#E3F2FD] cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </section>

      <div className="py-6 sm:py-10 max-w-[1320px] mx-auto px-3 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        {/* =====================================================================
            1. ALERTAS ACTIVAS (se generan solas a partir de la lluvia real)
            ===================================================================== */}
        <div>
          {/* Franja de estado: cuántos departamentos hay en cada nivel, en una sola línea */}
          {isLive && (
            <div className="mb-5 flex flex-wrap items-center rounded-xl border border-[#BBDEFB] bg-[#BBDEFB]/50">
              <span className="hidden md:inline px-5 py-3 text-sm font-bold text-[#111827] border-r border-[#E3F2FD] whitespace-nowrap">
                Departamentos
              </span>
              <div className="flex w-full sm:w-auto divide-x divide-[#E3F2FD]">
                {STATUS_COUNTERS.map(({ level, label, short }) => (
                  <span key={level} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-5 py-3 text-sm text-[#111827] whitespace-nowrap">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: LEVEL_STYLES[level].color }} />
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{label}</span>
                    <strong className="text-lg">{levelCounts[level]}</strong>
                  </span>
                ))}
              </div>
              {activeAlerts.length === 0 && (
                <span className="w-full sm:w-auto sm:ml-auto inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3 border-t sm:border-t-0 sm:border-l border-[#E3F2FD] text-sm font-bold text-[#1565C0]">
                  <ShieldCheck className="w-4 h-4" />
                  Sin alertas activas
                </span>
              )}
            </div>
          )}

          {dataStatus === 'cargando' ? (
            <div>
              {/* Forma de la franja de estado mientras se consulta la lluvia */}
              <div className="flex items-center gap-4 rounded-xl border border-[#E3F2FD] px-5 py-3.5">
                <Bone className="h-4 w-24 hidden md:block" />
                <Bone className="h-4 flex-1 max-w-32" />
                <Bone className="h-4 flex-1 max-w-36" />
                <Bone className="h-4 flex-1 max-w-28" />
              </div>
              <LoadingNote className="mt-3">Revisando la lluvia de las últimas 24 horas en los 25 departamentos…</LoadingNote>
            </div>
          ) : dataStatus === 'sin-conexion' ? (
            <ErrorNote
              message="No se pudo consultar la lluvia en este momento, por eso no se muestran alertas."
              onRetry={handleRefresh}
              retrying={refreshing}
            />
          ) : activeAlerts.length === 0 ? null : (
            <div className="space-y-3.5 sm:space-y-4">
              {activeAlerts.map((alert) => {
                const style = LEVEL_STYLES[alert.riskLevel];
                const station = stations.find((s) => `alerta-${s.id}` === alert.id);
                return (
                  <article
                    key={alert.id}
                    className="bg-[#E3F2FD]/60 rounded-xl border border-[#BBDEFB] p-4 sm:p-5 shadow-xs"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded-full border font-bold ${style.chip}`}><span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: style.color }} />
                              {style.label}
                            </span>
                            <span className="text-[#111827]">
                              {alert.department} · {alert.region}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-[#111827] mt-1.5 leading-snug">
                            {alert.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-[#111827] mt-2 leading-relaxed">
                            {alert.description}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#1565C0]">
                            <span>
                              <strong className="text-[#111827]">Estación:</strong> {alert.code}
                            </span>
                            <span>·</span>
                            <span>
                              <strong className="text-[#111827]">Lluvia:</strong> {alert.expectedRainfall}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-stretch gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setModalAlert(alert)}
                          className="flex-1 px-4 py-2 sm:py-2.5 rounded-lg bg-[#1E88E5] hover:bg-[#1976D2] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-1.5"
                        >
                          <span>Ver qué hacer</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        {station && (
                          <button
                            type="button"
                            onClick={() => onViewStationOnMap(station)}
                            className="flex-1 px-4 py-2 sm:py-2.5 rounded-lg border border-[#42A5F5] bg-white hover:bg-[#E3F2FD] text-[#1565C0] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-1.5"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Ver en el mapa</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Avisos por pronóstico: lo que viene en los próximos días */}
          {forecastNotices.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-bold text-[#111827] mb-2">Avisos por pronóstico (próximos 3 días)</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {forecastNotices.map(({ station, mm, date, index, level }) => {
                  const style = LEVEL_STYLES[level];
                  return (
                    <li
                      key={station.id}
                      className="rounded-xl border border-[#BBDEFB] bg-white p-3.5 flex items-center gap-3"
                    >
                      <CloudRain className="w-7 h-7 shrink-0" style={{ color: '#1565C0' }} />
                      <p className="flex-1 text-sm text-[#111827] leading-snug">
                        <strong>{station.department}:</strong> se esperan {mm.toFixed(1)} mm {longDay(date, index)}.
                      </p>
                      <span className={`px-2 py-0.5 rounded-full border text-xs font-bold whitespace-nowrap ${style.chip}`}><span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: style.color }} />
                        {style.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* =====================================================================
            2. VIGILANCIA: un gráfico grande por departamento
            ===================================================================== */}
        <div className="pt-4 border-t border-[#E3F2FD]">
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">Vigilancia de Lluvias</h2>
            <p className="text-xs sm:text-sm text-[#111827] mt-0.5">
              Elija un departamento para ver su lluvia de los últimos 7 días y el pronóstico de los próximos 3.
            </p>
          </div>
          <RainChart
            stations={stations}
            outlook={outlook}
            outlookStatus={outlookStatus}
            isLive={isLive}
            onViewStationOnMap={onViewStationOnMap}
          />
        </div>

        {/* =====================================================================
            3. HISTORIAL: días con lluvia sobre el umbral en los últimos 30 días
            ===================================================================== */}
        <div className="pt-4 border-t border-[#E3F2FD]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">
                Historial de Lluvias{outlookStatus === 'listo' && ` (${history.length})`}
              </h2>
              <p className="text-xs sm:text-sm text-[#111827] mt-0.5">
                Días en que una estación registró {UMBRAL_NARANJA_MM} mm o más.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              <div className="relative col-span-2 sm:col-auto">
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Buscar en historial..."
                  className="w-full sm:w-48 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#90CAF9] bg-white text-[#111827] focus:outline-none focus:border-[#1E88E5]"
                />
                <Search className="w-3.5 h-3.5 text-[#1565C0] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <select
                aria-label="Filtrar historial por región"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value as 'Todas' | NaturalRegion)}
                className="py-1.5 px-2 text-xs rounded-lg border border-[#90CAF9] bg-white text-[#111827] font-medium focus:outline-none focus:border-[#1E88E5] cursor-pointer"
              >
                <option value="Todas">Regiones: Todas</option>
                <option value="Costa">Costa</option>
                <option value="Sierra">Sierra</option>
                <option value="Selva">Selva</option>
              </select>

              <select
                aria-label="Filtrar historial por nivel"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as 'Todos' | RiskLevel)}
                className="py-1.5 px-2 text-xs rounded-lg border border-[#90CAF9] bg-white text-[#111827] font-medium focus:outline-none focus:border-[#1E88E5] cursor-pointer"
              >
                <option value="Todos">Niveles: Todos</option>
                <option value="ALTO">Peligro (más de {UMBRAL_ROJO_MM} mm)</option>
                <option value="MEDIO">Precaución ({UMBRAL_NARANJA_MM}–{UMBRAL_ROJO_MM} mm)</option>
              </select>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filteredHistory.length === 0}
                className="col-span-2 sm:col-auto inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-[#42A5F5] bg-white hover:bg-[#E3F2FD] text-[#1565C0] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#BBDEFB] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse bg-white min-w-[560px]">
                <thead>
                  <tr className="bg-[#E3F2FD] border-b border-[#BBDEFB] text-[#1565C0] text-xs font-bold">
                    <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Fecha</th>
                    <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Región</th>
                    <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Evento</th>
                    <th className="py-3 px-3 sm:px-4 whitespace-nowrap text-right">Lluvia del día</th>
                    <th className="py-3 px-3 sm:px-4 whitespace-nowrap text-right">Nivel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3F2FD] text-xs sm:text-sm text-[#111827]">
                  {outlookStatus === 'cargando' ? (
                    // Filas en espera con la forma de la tabla
                    Array.from({ length: 5 }, (_, i) => (
                      <tr key={i} aria-hidden="true">
                        <td className="py-3.5 px-3 sm:px-4"><Bone className="h-3.5 w-20" /></td>
                        <td className="py-3.5 px-3 sm:px-4"><Bone className="h-3.5 w-40" /></td>
                        <td className="py-3.5 px-3 sm:px-4"><Bone className="h-3.5 w-28" /></td>
                        <td className="py-3.5 px-3 sm:px-4"><Bone className="h-3.5 w-16 ml-auto" /></td>
                        <td className="py-3.5 px-3 sm:px-4"><Bone className="h-5 w-20 ml-auto rounded-full" /></td>
                      </tr>
                    ))
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 px-4 text-center text-xs text-[#1565C0]">
                        {outlookStatus === 'error' && 'No se pudo cargar el historial. Intente actualizar en unos minutos.'}
                        {outlookStatus === 'listo' &&
                          (history.length === 0
                            ? `Ninguna estación superó los ${UMBRAL_NARANJA_MM} mm en los últimos 30 días.`
                            : 'No hay registros que coincidan con los filtros.')}
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((row) => {
                      const style = LEVEL_STYLES[row.riskLevel];
                      return (
                        <tr key={row.id} className="bg-white hover:bg-[#E3F2FD]/40 transition-colors">
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-xs text-[#111827] whitespace-nowrap">
                            {row.date}
                          </td>
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-medium text-[#111827]">
                            {row.region}{' '}
                            <span className="text-xs text-[#1565C0] font-normal">· {row.naturalRegion}</span>
                            <span className="block text-xs text-[#111827] font-normal">{row.station}</span>
                          </td>
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-[#111827]">{row.alertType}</td>
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right text-xs font-semibold text-[#1565C0] whitespace-nowrap">
                            {row.recordedMm}
                          </td>
                          <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${style.chip}`}><span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: style.color }} />
                              {style.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
      <DetailModal activeAlert={modalAlert} onClose={() => setModalAlert(null)} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Ventana «Ver qué hacer» de una alerta
// ---------------------------------------------------------------------------

interface DetailModalProps {
  activeAlert: ActiveAlert | null;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ activeAlert, onClose }) => {
  if (!activeAlert) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#BBDEFB] rounded-xl sm:rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-4 sm:p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {activeAlert && (
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-[#E3F2FD] pb-3 sm:pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-xs text-[#1565C0] font-mono-tabular">
                  <span>{activeAlert.code}</span>
                  <span>·</span>
                  <span>Región {activeAlert.region}</span>
                  <span>·</span>
                  <span className="font-bold text-[#111827]">Riesgo: {LEVEL_STYLES[activeAlert.riskLevel].label}</span>
                </div>
                <h3 className="text-base sm:text-xl font-bold text-[#111827] mt-1 leading-snug">
                  {activeAlert.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-lg text-[#111827] hover:bg-[#E3F2FD] transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs sm:text-sm text-[#111827]">
              <div className="p-3 sm:p-4 rounded-lg bg-[#E8F1FB] border-l-4 border-[#1565C0]">
                <div className="flex items-center gap-2 font-semibold text-[#111827]">
                  <AlertIcon className="w-5 h-5 shrink-0" color="#1565C0" />
                  <span>Lluvia registrada: {activeAlert.expectedRainfall}</span>
                </div>
                <p className="mt-1 text-[#111827] leading-relaxed">{activeAlert.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-lg border border-[#BBDEFB] bg-white">
                  <div className="text-xs text-[#1565C0]">Cuenca Hidrográfica</div>
                  <div className="font-semibold text-[#111827] mt-0.5">{activeAlert.riverBasin}</div>
                </div>
                <div className="p-3 rounded-lg border border-[#BBDEFB] bg-white">
                  <div className="text-xs text-[#1565C0]">Emitida</div>
                  <div className="font-semibold text-[#111827] mt-0.5 font-mono-tabular">
                    {activeAlert.issuedAt}, {activeAlert.validUntil}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-[#1565C0] text-xs sm:text-sm mb-1">
                  Provincias Comprendidas ({activeAlert.department}):
                </h4>
                <p className="text-xs sm:text-sm text-[#111827]">{activeAlert.provinces.join(' · ')}</p>
              </div>

              <div>
                <h4 className="font-semibold text-[#1565C0] text-xs sm:text-sm mb-2">
                  Qué hacer (recomendaciones de Defensa Civil):
                </h4>
                <ul className="space-y-1.5">
                  {activeAlert.protocolSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[#111827]">
                      <CheckCircle2 className="w-4 h-4 text-[#1565C0] shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#E3F2FD] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-[#1565C0] font-mono-tabular">
                {activeAlert.evacuationCenters > 0
                  ? `Refugios: ${activeAlert.evacuationCenters} centros habilitados`
                  : 'Emergencias: Defensa Civil 115'}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#1E88E5] hover:bg-[#1976D2] text-white text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
