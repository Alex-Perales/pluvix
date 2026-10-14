import React from 'react';
import { Layers, CloudRain, Gauge, Megaphone, MapPin, Clock, ChevronRight, Backpack, LifeBuoy, HeartPulse, PhoneCall } from 'lucide-react';
import { WeatherStation, EMERGENCY_SITES, openOfficialSiteOnDesktop, RISK_COLOR } from '../data/stations';
import { NavPage } from '../components/Layout';
import { AlertIcon, ErrorNote, LoadingNote } from '../components/ui';
import { LiveStatus } from '../data/weather';

interface InicioPageProps {
  dataStatus: LiveStatus;
  onRetry: () => void;
  stations: WeatherStation[];
  selectedStation: WeatherStation;
  onSelectStation: (station: WeatherStation) => void;
  onNavigate: (page: NavPage) => void;
}

const RISK_LEVELS = ['BAJO', 'MEDIO', 'ALTO'] as const;

// color: relleno de íconos y barras · badge: fondo con texto blanco encima
const RISK_STYLES = {
  ALTO: {
    label: 'Alto',
    color: RISK_COLOR.ALTO,
    badge: '#1565C0',
    bg: 'bg-white',
    border: 'border-[#1565C0]',
    text: 'text-[#111827]',
    value: 'text-[#111827]',
    desc: 'Alerta roja: umbral de lluvia superado.',
  },
  MEDIO: {
    label: 'Medio',
    color: RISK_COLOR.MEDIO,
    badge: '#1565C0',
    bg: 'bg-white',
    border: 'border-[#1565C0]',
    text: 'text-[#111827]',
    value: 'text-[#111827]',
    desc: 'Alerta naranja: quebradas bajo vigilancia.',
  },
  BAJO: {
    label: 'Bajo',
    color: RISK_COLOR.BAJO,
    badge: '#1565C0',
    bg: 'bg-white',
    border: 'border-[#1565C0]',
    text: 'text-[#111827]',
    value: 'text-[#111827]',
    desc: 'Sin alerta: lluvias dentro de lo normal.',
  },
};

// Cada nivel de riesgo activa una fase del sistema de alerta temprana
const SAT_PHASES = [
  {
    title: 'Monitoreo de lluvias',
    text: 'Las estaciones registran la lluvia acumulada en las cuencas de Costa, Sierra y Selva.',
    Icon: CloudRain,
  },
  {
    title: 'Evaluación de umbrales',
    text: 'Se compara la lluvia acumulada con los umbrales. Si se superan, se emite el aviso.',
    Icon: Gauge,
  },
  {
    title: 'Alerta y evacuación',
    text: 'Se avisa a la población, se cierran badenes y se evacúa a las familias en zonas de riesgo.',
    Icon: Megaphone,
  },
];

// Pasos generales de Defensa Civil ante lluvias intensas, huaicos e inundaciones
const EMERGENCY_STEPS = [
  {
    moment: 'Antes',
    title: 'Prepárate',
    Icon: Backpack,
    color: '#1565C0',
    steps: [
      'Averigua si tu casa está cerca de un río, una quebrada o una zona baja.',
      'Ubica la zona segura y la ruta de evacuación de tu barrio.',
      'Arma tu mochila de emergencia: agua, comida no perecible, linterna, radio, botiquín y documentos.',
      'Acuerda con tu familia un punto de encuentro y cómo comunicarse.',
    ],
  },
  {
    moment: 'Durante',
    title: 'Ponte a salvo',
    Icon: LifeBuoy,
    color: '#1565C0',
    steps: [
      'Aléjate de ríos, quebradas y badenes; nunca intentes cruzarlos.',
      'Si te lo indican o el agua sube, evacúa de inmediato hacia la zona segura.',
      'Corta la electricidad y el gas antes de salir de casa.',
      'Ayuda primero a niños, adultos mayores y personas con discapacidad.',
    ],
  },
  {
    moment: 'Después',
    title: 'Regresa con cuidado',
    Icon: HeartPulse,
    color: '#1565C0',
    steps: [
      'Vuelve a casa solo cuando las autoridades digan que es seguro.',
      'No toques cables caídos ni enciendas la luz si hubo inundación.',
      'Hierve o desinfecta el agua antes de beberla.',
      'Reporta los daños a tu municipalidad y sigue los avisos oficiales.',
    ],
  },
];

export const InicioPage: React.FC<InicioPageProps> = ({
  dataStatus,
  onRetry,
  stations,
  selectedStation,
  onSelectStation,
  onNavigate,
}) => {
  const risk = RISK_STYLES[selectedStation.riskLevel];
  const isLive = dataStatus === 'en-vivo';
  const currentPhase = RISK_LEVELS.indexOf(selectedStation.riskLevel);

  const rainGap = selectedStation.precipitationMm - selectedStation.thresholdRedMm;
  const overThreshold = rainGap >= 0;
  // La barra deja espacio a la derecha para que se vea cuánto se pasa del umbral
  const rainScale = Math.max(selectedStation.thresholdRedMm * 1.5, selectedStation.precipitationMm * 1.1);

  return (
    <div className="w-full bg-white">
      {/* =====================================================================
          PORTADA: VIDEO DE LLUVIA A PANTALLA COMPLETA
          ===================================================================== */}
      <section className="relative w-full h-svh min-h-[420px] overflow-hidden bg-[#0B2A1A]">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/media/portada-lluvia.mp4"
          poster="/media/portada.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/25" />

        <div className="absolute inset-0 px-4 sm:px-6 flex flex-col justify-center items-center text-center text-white">
          <h1 className="text-white font-bold text-[3rem] leading-none sm:text-[4.5rem] lg:text-[5.5rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
            Pluvix
          </h1>
          {/* Descripción: idea principal en una línea y, debajo, el detalle en dos */}
          <p className="mt-4 sm:mt-5 text-balance sm:whitespace-nowrap text-white text-[1.25rem] leading-snug sm:text-[1.25rem] md:text-[1.5rem] lg:text-[1.875rem] xl:text-[2.25rem] drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
            Plataforma de alerta temprana ante el Fenómeno de El Niño
          </p>
          <p className="mt-3 text-white/90 text-base leading-relaxed sm:text-xl lg:text-[1.5rem] drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
            <span className="sm:block">Vigilamos la lluvia en los 25 departamentos del Perú</span>{' '}
            <span className="sm:block">y te avisamos a tiempo.</span>
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onNavigate('mapa')}
              className="w-full max-w-xs sm:w-auto sm:max-w-none px-7 py-4 rounded-2xl bg-[#1E88E5] hover:bg-[#1976D2] text-white text-base sm:text-lg font-semibold transition-colors shadow-lg cursor-pointer flex items-center justify-center gap-2.5"
            >
              <Layers className="w-5 h-5" />
              <span>Explorar Mapa Interactivo</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('alertas')}
              className="w-full max-w-xs sm:w-auto sm:max-w-none px-7 py-4 rounded-2xl bg-white hover:bg-[#E3F2FD] text-[#111827] text-base sm:text-lg font-semibold transition-colors shadow-lg cursor-pointer flex items-center justify-center gap-2.5"
            >
              <AlertIcon className="w-6 h-6" color="currentColor" />
              <span>Ver Alertas Vigentes</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          RESUMEN DE INDICADORES DE LA ESTACIÓN SELECCIONADA
          ===================================================================== */}
      <section className="py-8 sm:py-14 max-w-[1320px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-[#E3F2FD]">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#111827]">
              ¿Cómo está la lluvia en {selectedStation.department}?
            </h2>
            <p className="text-xs sm:text-sm text-[#111827] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#1565C0]" />
                {selectedStation.name} · {selectedStation.basin}
              </span>
              {isLive && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#1565C0]" />
                  Actualizado hace {selectedStation.updatedMinutesAgo} min
                </span>
              )}
            </p>
          </div>

          <label className="flex flex-col gap-1 text-xs font-bold text-[#1565C0] uppercase tracking-wider">
            Cambiar región
            <select
              value={selectedStation.id}
              onChange={(e) => {
                const found = stations.find((s) => s.id === e.target.value);
                if (found) onSelectStation(found);
              }}
              className="w-full sm:w-auto px-3 py-2 rounded-lg border border-[#90CAF9] bg-white text-xs sm:text-sm text-[#111827] font-medium normal-case tracking-normal focus:outline-none focus:border-[#1E88E5] cursor-pointer"
            >
              {(['Costa', 'Sierra', 'Selva'] as const).map((zone) => (
                <optgroup key={zone} label={zone}>
                  {stations
                    .filter((st) => st.region === zone)
                    .sort((a, b) => a.department.localeCompare(b.department, 'es'))
                    .map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.department}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>

        {!isLive ? (
          <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {dataStatus === 'sin-conexion' ? (
              <div className="md:col-span-2">
                <ErrorNote message="No se pudo consultar la lluvia en este momento. Revise su conexión." onRetry={onRetry} />
              </div>
            ) : (
              <>
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-2xl border border-[#E3F2FD] p-6 animate-pulse" aria-hidden="true">
                    <div className="h-4 w-1/3 rounded bg-[#E3F2FD]" />
                    <div className="mt-4 h-9 w-1/2 rounded bg-[#E3F2FD]" />
                    <div className="mt-3 h-4 w-2/3 rounded bg-[#E3F2FD]" />
                    <div className="mt-6 h-2 w-full rounded bg-[#E3F2FD]" />
                  </div>
                ))}
                <LoadingNote className="md:col-span-2">Consultando la lluvia en tiempo real…</LoadingNote>
              </>
            )}
          </div>
        ) : (
        <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Card 1: Nivel de riesgo con semáforo */}
          <article
            className={`${risk.bg} rounded-2xl p-5 sm:p-6 border-2 ${risk.border} shadow-xs flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-semibold ${risk.text}`}>Nivel de riesgo</h3>
                <AlertIcon className="w-7 h-7" color="#1565C0" />
              </div>
              <p className={`mt-2 text-4xl sm:text-5xl font-extrabold tracking-tight ${risk.value}`}>
                {selectedStation.riskLevel}
              </p>
              <p className={`mt-1 text-sm font-medium ${risk.text}`}>{risk.desc}</p>
            </div>

            {/* Semáforo: resalta el nivel vigente */}
            <div className="mt-5 grid grid-cols-3 gap-1.5" aria-hidden="true">
              {RISK_LEVELS.map((level) => (
                <div key={level}>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor:
                        level === selectedStation.riskLevel ? RISK_STYLES[level].color : 'rgba(17,24,39,0.12)',
                    }}
                  />
                  <span
                    className={`block mt-1 text-xs text-center ${
                      level === selectedStation.riskLevel ? `font-bold ${risk.text}` : 'text-[#111827]'
                    }`}
                  >
                    {RISK_STYLES[level].label}
                  </span>
                </div>
              ))}
            </div>
          </article>

          {/* Card 2: Lluvia acumulada frente al umbral */}
          <article className="bg-white rounded-2xl p-5 sm:p-6 border border-[#BBDEFB] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111827]">Lluvia acumulada (24 h)</h3>
                <CloudRain className="w-6 h-6 text-[#1565C0]" />
              </div>
              <p className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111827]">
                {selectedStation.precipitationMm.toFixed(1)}
                <span className="ml-1.5 text-lg font-semibold text-[#111827]">mm</span>
              </p>
              <p
                className={`mt-1 text-sm font-medium ${
                  overThreshold ? 'text-[#111827]' : 'text-[#111827]'
                }`}
              >
                {overThreshold
                  ? `+${rainGap.toFixed(1)} mm sobre el umbral`
                  : `Faltan ${Math.abs(rainGap).toFixed(1)} mm para el umbral`}
              </p>
            </div>

            {/* Barra de lluvia con la marca del umbral de alerta roja */}
            <div className="mt-5">
              <div className="relative h-2 rounded-full bg-[#E3F2FD]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${(selectedStation.precipitationMm / rainScale) * 100}%`,
                    backgroundColor: '#1565C0',
                  }}
                />
                <div
                  className="absolute -top-1 -bottom-1 w-0.5 bg-[#111827]"
                  style={{ left: `${(selectedStation.thresholdRedMm / rainScale) * 100}%` }}
                />
              </div>
              <span className="block mt-1 text-xs text-[#111827]">
                Umbral de alerta roja: {selectedStation.thresholdRedMm.toFixed(1)} mm
              </span>
            </div>
          </article>
        </div>
        )}
      </section>

      {/* =====================================================================
          FASES DEL SISTEMA SAT (resalta la fase que corresponde a la estación)
          ===================================================================== */}
      <section className="py-10 sm:py-14 bg-[#E3F2FD]/30 border-t border-[#BBDEFB]">
        <div className="max-w-[1320px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#111827]">
              ¿Cómo funciona la alerta temprana?
            </h2>
            <p className="text-xs sm:text-sm text-[#111827] mt-1.5">
              Tres fases coordinadas entre SENAMHI, INDECI y las autoridades regionales.
            </p>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {SAT_PHASES.map(({ title, text, Icon }, index) => {
              const isCurrent = isLive && index === currentPhase;
              return (
                <li
                  key={title}
                  className={`relative bg-white rounded-2xl p-5 sm:p-6 border-2 ${
                    isCurrent ? risk.border : 'border-[#BBDEFB]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: isCurrent ? '#1565C0' : '#90CAF9' }}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                        Fase {index + 1}
                      </span>
                    </div>
                    {isCurrent && (
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap"
                        style={{ backgroundColor: risk.badge }}
                      >
                        Fase actual
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#111827] mt-4">{title}</h3>
                  <p className="text-sm text-[#111827] mt-1.5 leading-relaxed">{text}</p>

                  {/* Flecha hacia la fase siguiente */}
                  {index < SAT_PHASES.length - 1 && (
                    <div
                      className="hidden md:flex absolute top-1/2 -right-2 sm:-right-3 -translate-y-1/2 translate-x-1/2 z-10 w-7 h-7 rounded-full bg-white border border-[#BBDEFB] items-center justify-center text-[#1565C0]"
                      aria-hidden="true"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {isLive && (
            <p className="mt-5 text-center text-xs sm:text-sm text-[#111827]">
              {selectedStation.department} se encuentra en la fase {currentPhase + 1} según su nivel de
              riesgo {selectedStation.riskLevel.toLowerCase()}.
            </p>
          )}
        </div>
      </section>

      {/* =====================================================================
          CÓMO ACTUAR FRENTE A UNA EMERGENCIA: ANTES, DURANTE Y DESPUÉS
          ===================================================================== */}
      <section className="py-10 sm:py-14 bg-white border-t border-[#BBDEFB]">
        <div className="max-w-[1320px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#111827]">
              ¿Cómo actuar frente a una emergencia?
            </h2>
            <p className="text-xs sm:text-sm text-[#111827] mt-1.5">
              Pasos sencillos ante lluvias intensas, huaicos e inundaciones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {EMERGENCY_STEPS.map(({ moment, title, Icon, color, steps }) => (
              <article key={moment} className="bg-white rounded-2xl border border-[#BBDEFB] overflow-hidden">
                <div className="flex items-center gap-3 px-5 sm:px-6 py-4 text-white" style={{ backgroundColor: color }}>
                  <Icon className="w-8 h-8 shrink-0" />
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider opacity-90">
                      {moment}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold leading-tight">{title}</h3>
                  </div>
                </div>
                <ol className="px-5 sm:px-6 py-5 space-y-3">
                  {steps.map((step, index) => (
                    <li key={step} className="flex items-start gap-3 text-sm text-[#111827] leading-relaxed">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                        style={{ color: '#1565C0', backgroundColor: '#E8F1FB' }}
                      >
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>

          {/* Línea de emergencia */}
          <div className="mt-6 rounded-2xl bg-[#111827] text-white px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="text-sm sm:text-base">
              <strong>¿Estás en peligro ahora?</strong> Llama a Defensa Civil o a los Bomberos.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a
                href="tel:115"
                onClick={(e) => openOfficialSiteOnDesktop(e, EMERGENCY_SITES['115'])}
                className="px-4 py-2 rounded-lg bg-white hover:bg-[#E8F1FB] text-[#1565C0] text-sm font-bold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <PhoneCall className="w-4 h-4" />
                Defensa Civil 115
              </a>
              <a
                href="tel:116"
                onClick={(e) => openOfficialSiteOnDesktop(e, EMERGENCY_SITES['116'])}
                className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-bold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <PhoneCall className="w-4 h-4" />
                Bomberos 116
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
