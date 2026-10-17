import React, { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { WeatherStation, NaturalRegion, RiskLevel, RISK_COLOR } from '../data/stations';
import { PeruMap } from '../components/PeruMap';
import { LiveStatus } from '../data/weather';

interface MapaPageProps {
  dataStatus: LiveStatus;
  stations: WeatherStation[];
  selectedStation: WeatherStation;
  onSelectStation: (station: WeatherStation) => void;
}

const RISK_UI: Record<RiskLevel, { label: string; color: string; chip: string }> = {
  ALTO: { label: 'Peligro', color: RISK_COLOR.ALTO, chip: 'bg-white text-[#111827] border-[#BBDEFB]' },
  MEDIO: { label: 'Precaución', color: RISK_COLOR.MEDIO, chip: 'bg-white text-[#111827] border-[#BBDEFB]' },
  BAJO: { label: 'Normal', color: RISK_COLOR.BAJO, chip: 'bg-white text-[#111827] border-[#BBDEFB]' },
};

export const MapaPage: React.FC<MapaPageProps> = ({
  dataStatus,
  stations,
  selectedStation,
  onSelectStation,
}) => {

  const [selectedRegion, setSelectedRegion] = useState<'Todas' | NaturalRegion>('Todas');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'Todos' | RiskLevel>('Todos');

  // Filtrado de estaciones (la lista va de la más lluviosa a la menos)
  const filteredStations = useMemo(() => {
    return stations
      .filter((s) => {
        const matchRegion = selectedRegion === 'Todas' || s.region === selectedRegion;
        const matchRisk = selectedRiskFilter === 'Todos' || s.riskLevel === selectedRiskFilter;
        return matchRegion && matchRisk;
      })
      .sort((a, b) => b.precipitationMm - a.precipitationMm);
  }, [stations, selectedRegion, selectedRiskFilter]);

  // Cuántas estaciones hay en cada nivel dentro de la región elegida
  const riskCounts = useMemo(() => {
    const inRegion = stations.filter((s) => selectedRegion === 'Todas' || s.region === selectedRegion);
    return {
      Todos: inRegion.length,
      ALTO: inRegion.filter((s) => s.riskLevel === 'ALTO').length,
      MEDIO: inRegion.filter((s) => s.riskLevel === 'MEDIO').length,
      BAJO: inRegion.filter((s) => s.riskLevel === 'BAJO').length,
    };
  }, [stations, selectedRegion]);

  // Hasta tener datos reales no se muestran cifras
  const isLive = dataStatus === 'en-vivo';

  const hasFilters = selectedRegion !== 'Todas' || selectedRiskFilter !== 'Todos';
  const clearFilters = () => {
    setSelectedRegion('Todas');
    setSelectedRiskFilter('Todos');
  };


  return (
    <div className="w-full bg-white">
      {/* Encabezado de la página */}
      <section className="max-w-[1320px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <h1 className="text-2xl font-bold text-[#111827]">Mapa de lluvias</h1>
        <p className="text-sm text-[#111827] mt-1">Lluvia de las últimas 24 horas en {stations.length} estaciones de Costa, Sierra y Selva.</p>
      </section>

      {/* =====================================================================
          CONTENIDO: MAPA INTERACTIVO Y CONTROLES ADAPTABLES A CELULARES
          ===================================================================== */}
      <section className="py-6 sm:py-10 max-w-[1320px] mx-auto px-3 sm:px-6 lg:px-8">
        {/* Grid de Mapa + Panel Lateral (Adaptable a pantallas pequeñas) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Mapa Principal: en móviles tiene una altura táctil cómoda */}
          <div className="lg:col-span-8 order-1">
            <PeruMap
              stations={filteredStations}
              selectedStation={selectedStation}
              onSelectStation={onSelectStation}
              heightClass="h-[400px] sm:h-[480px] lg:h-[620px]"
            />
          </div>

          {/* Panel lateral: estación elegida, filtros y lista de estaciones */}
          <aside className="lg:col-span-4 order-2 bg-white rounded-xl border border-[#BBDEFB] p-4 sm:p-5 shadow-xs space-y-5 lg:flex lg:flex-col lg:h-[620px]">
            {/* Estación seleccionada */}
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#1565C0] mb-2">Estación seleccionada</h3>
              <div className="p-3.5 rounded-lg bg-[#E3F2FD]/50 border border-[#BBDEFB]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#111827]">
                      {selectedStation.department} · {selectedStation.region}
                    </div>
                    <div className="text-xs text-[#111827] truncate">{selectedStation.name}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-xs font-bold whitespace-nowrap ${RISK_UI[selectedStation.riskLevel].chip}`}
                  ><span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: RISK_UI[selectedStation.riskLevel].color }} />
                    Riesgo {RISK_UI[selectedStation.riskLevel].label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#BBDEFB]">
                  <div>
                    <span className="text-[#1565C0] block text-xs">Lluvia en 24 h</span>
                    <strong className="text-[#111827] text-lg">{isLive ? `${selectedStation.precipitationMm.toFixed(1)} mm` : '—'}</strong>
                  </div>
                  <div>
                    <span className="text-[#1565C0] block text-xs">Actualizado</span>
                    <strong className="text-[#111827] text-lg">{isLive ? `hace ${selectedStation.updatedMinutesAgo} min` : '—'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros: región y nivel de riesgo */}
            <div className="pt-4 border-t border-[#E3F2FD] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-[#1565C0] flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#1565C0]" />
                  <span>Filtrar estaciones</span>
                </h3>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-[#1565C0] hover:underline cursor-pointer"
                  >
                    Quitar filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {(['Todas', 'Costa', 'Sierra', 'Selva'] as const).map((region) => {
                  const active = selectedRegion === region;
                  return (
                    <button
                      key={region}
                      type="button"
                      onClick={() => setSelectedRegion(region)}
                      aria-pressed={active}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        active
                          ? 'bg-[#1E88E5] text-white border-[#1E88E5]'
                          : 'bg-white text-[#111827] border-[#BBDEFB] hover:bg-[#E3F2FD]'
                      }`}
                    >
                      {region}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {(['Todos', 'ALTO', 'MEDIO', 'BAJO'] as const).map((risk) => {
                  const active = selectedRiskFilter === risk;
                  return (
                    <button
                      key={risk}
                      type="button"
                      onClick={() => setSelectedRiskFilter(risk)}
                      aria-pressed={active}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center justify-center gap-1 ${
                        active
                          ? 'bg-[#1565C0] text-white border-[#1565C0]'
                          : 'bg-white text-[#111827] border-[#BBDEFB] hover:bg-[#E3F2FD]'
                      }`}
                    >
                      {risk !== 'Todos' && (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_UI[risk].color }} />
                      )}
                      <span>{risk === 'Todos' ? 'Todos' : RISK_UI[risk].label}</span>
                      <span className={active ? 'opacity-80' : 'text-[#111827]'}>{riskCounts[risk]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de estaciones: al elegir una, el mapa vuela hasta ella */}
            <div className="pt-4 border-t border-[#E3F2FD] lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
              <h3 className="text-xs sm:text-sm font-bold text-[#1565C0] mb-2">
                Estaciones ({filteredStations.length})
              </h3>

              {filteredStations.length === 0 ? (
                <div className="p-4 rounded-lg border border-[#E3F2FD] bg-[#F8FAFC] text-center text-xs text-[#111827]">
                  <p>
                    Ninguna estación
                    {selectedRegion !== 'Todas' && ` de la ${selectedRegion}`}
                    {selectedRiskFilter !== 'Todos' && ` está en riesgo ${RISK_UI[selectedRiskFilter].label.toLowerCase()}`}
                    {selectedRiskFilter === 'Todos' && ' coincide'} en este momento.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-2 font-semibold text-[#1565C0] hover:underline cursor-pointer"
                  >
                    Ver todas las estaciones
                  </button>
                </div>
              ) : (
                <div className="max-h-72 lg:max-h-none lg:flex-1 lg:min-h-0 overflow-y-auto divide-y divide-[#E3F2FD] border border-[#E3F2FD] rounded-lg">
                  {filteredStations.map((st) => {
                    const isCurrent = st.id === selectedStation.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onSelectStation(st)}
                        aria-current={isCurrent}
                        className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                          isCurrent ? 'bg-[#E3F2FD] font-bold' : 'bg-white hover:bg-[#E3F2FD]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: RISK_UI[st.riskLevel].color }}
                          />
                          <span className="truncate text-[#111827]">{st.department}</span>
                        </div>
                        <span className="font-bold text-[#1565C0] shrink-0">{isLive ? `${st.precipitationMm.toFixed(1)} mm` : '—'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};
