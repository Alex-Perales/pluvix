import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ArrowLeft, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, LocateFixed, MapPin, Moon, Sun, X, Minus, Plus, Search, SwatchBook } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WeatherStation, RiskLevel, RISK_COLOR, UMBRAL_NARANJA_MM, UMBRAL_ROJO_MM } from '../data/stations';

// Panel del mapa: buscador de regiones del Perú y pronóstico real (Open-Meteo) del lugar elegido

export interface Place {
  city: string;
  region: string;
  lat: number;
  lng: number;
}

// Capitales de los 24 departamentos y la Provincia Constitucional del Callao
export const PERU_PLACES: Place[] = [
  { city: 'Lima', region: 'Lima', lat: -12.0464, lng: -77.0428 },
  { city: 'Callao', region: 'Callao', lat: -12.0566, lng: -77.1181 },
  { city: 'Chachapoyas', region: 'Amazonas', lat: -6.2317, lng: -77.869 },
  { city: 'Huaraz', region: 'Áncash', lat: -9.5278, lng: -77.5278 },
  { city: 'Abancay', region: 'Apurímac', lat: -13.6339, lng: -72.8814 },
  { city: 'Arequipa', region: 'Arequipa', lat: -16.409, lng: -71.5375 },
  { city: 'Ayacucho', region: 'Ayacucho', lat: -13.1588, lng: -74.2239 },
  { city: 'Cajamarca', region: 'Cajamarca', lat: -7.1617, lng: -78.5128 },
  { city: 'Cusco', region: 'Cusco', lat: -13.5319, lng: -71.9675 },
  { city: 'Huancavelica', region: 'Huancavelica', lat: -12.7861, lng: -74.9758 },
  { city: 'Huánuco', region: 'Huánuco', lat: -9.9306, lng: -76.2422 },
  { city: 'Ica', region: 'Ica', lat: -14.0678, lng: -75.7286 },
  { city: 'Huancayo', region: 'Junín', lat: -12.0651, lng: -75.2049 },
  { city: 'Trujillo', region: 'La Libertad', lat: -8.1116, lng: -79.0288 },
  { city: 'Chiclayo', region: 'Lambayeque', lat: -6.7714, lng: -79.8409 },
  { city: 'Iquitos', region: 'Loreto', lat: -3.7491, lng: -73.2538 },
  { city: 'Puerto Maldonado', region: 'Madre de Dios', lat: -12.5933, lng: -69.1891 },
  { city: 'Moquegua', region: 'Moquegua', lat: -17.1956, lng: -70.9353 },
  { city: 'Cerro de Pasco', region: 'Pasco', lat: -10.6864, lng: -76.2625 },
  { city: 'Piura', region: 'Piura', lat: -5.1945, lng: -80.6328 },
  { city: 'Puno', region: 'Puno', lat: -15.8402, lng: -70.0219 },
  { city: 'Moyobamba', region: 'San Martín', lat: -6.0342, lng: -76.9717 },
  { city: 'Tacna', region: 'Tacna', lat: -18.0066, lng: -70.2463 },
  { city: 'Tumbes', region: 'Tumbes', lat: -3.5669, lng: -80.4515 },
  { city: 'Pucallpa', region: 'Ucayali', lat: -8.3791, lng: -74.5539 },
];

interface Forecast {
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
  hourly: {
    temperature_2m: number[];
    precipitation: number[];
    weather_code: number[];
    is_day: number[];
  };
}

const WEEKDAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const LABEL_HOURS = [1, 4, 7, 10, 13, 16, 19, 22];

export const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Códigos meteorológicos WMO → ícono y color
const weatherIcon = (code: number, isDay = true) => {
  if (code <= 1) return isDay ? { Icon: Sun, color: '#F59E0B' } : { Icon: Moon, color: '#64748B' };
  if (code === 2) return isDay ? { Icon: CloudSun, color: '#F59E0B' } : { Icon: CloudMoon, color: '#64748B' };
  if (code === 3) return { Icon: Cloud, color: '#94A3B8' };
  if (code <= 48) return { Icon: CloudFog, color: '#94A3B8' };
  if (code <= 57) return { Icon: CloudDrizzle, color: '#1E88E5' };
  if (code <= 67 || (code >= 80 && code <= 82)) return { Icon: CloudRain, color: '#1565C0' };
  if (code <= 86) return { Icon: CloudSnow, color: '#60A5FA' };
  return { Icon: CloudLightning, color: '#7C3AED' };
};

interface PlaceWeatherProps {
  initialPlace?: Place | null;
  onSelectPlace: (place: Place) => void;
  onClose: () => void;
}

export const PlaceWeather: React.FC<PlaceWeatherProps> = ({ initialPlace = null, onSelectPlace, onClose }) => {
  const [query, setQuery] = useState('');
  const [place, setPlace] = useState<Place | null>(initialPlace);
  const [locating, setLocating] = useState(false);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return PERU_PLACES;
    return PERU_PLACES.filter((p) => normalize(`${p.city} ${p.region}`).includes(q));
  }, [query]);

  const choose = (p: Place) => {
    setPlace(p);
    onSelectPlace(p);
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        choose({ city: 'Mi ubicación', region: 'Ubicación actual', lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setLocating(false),
      { timeout: 10000 }
    );
  };

  return (
    // Anclado abajo a la derecha: la lista sube hasta el 80 % del mapa y el pronóstico ocupa solo lo que necesita
    <div
      className={`absolute right-0 bottom-0 z-40 w-full sm:w-[380px] bg-white rounded-t-2xl sm:rounded-tr-none shadow-2xl flex flex-col overflow-hidden text-[#111827] ${
        place ? 'max-h-[80%]' : 'h-[80%]'
      }`}
    >
      {place ? (
        <ForecastView place={place} onBack={() => setPlace(null)} onClose={onClose} />
      ) : (
        <>
          <div className="relative flex items-center justify-center px-4 pt-4 pb-3">
            <h3 className="text-base font-bold">Buscar lugares</h3>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-2.5 w-10 h-10 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#1565C0] hover:bg-[#E3F2FD] cursor-pointer"
              aria-label="Cerrar buscador"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 px-4 pb-3">
            <button
              type="button"
              onClick={locateMe}
              className={`p-1.5 rounded-full text-[#1565C0] hover:bg-[#E3F2FD] cursor-pointer ${locating ? 'animate-pulse' : ''}`}
              aria-label="Usar mi ubicación"
              title="Usar mi ubicación"
            >
              <LocateFixed className="w-6 h-6" />
            </button>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="El tiempo en…"
              autoFocus
              className="flex-1 min-w-0 px-4 py-2.5 rounded-full bg-[#F1F5F9] text-sm text-[#111827] placeholder-[#111827] focus:outline-none focus:ring-2 focus:ring-[#90CAF9]"
            />
          </div>

          <ul className="flex-1 overflow-y-auto border-t border-[#F1F5F9]">
            {results.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-[#111827]">Sin resultados para “{query}”</li>
            )}
            {results.map((p) => (
              <li key={p.city} className="border-b border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => choose(p)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F8FAFC] cursor-pointer"
                >
                  <MapPin className="w-6 h-6 text-[#1565C0] shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold truncate">{p.city}</span>
                    <span className="block text-sm truncate">{p.region}</span>
                  </span>
                  <span className="text-xs font-semibold text-[#111827]">PE</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

interface ForecastViewProps {
  place: Place;
  onBack: () => void;
  onClose: () => void;
}

const ForecastView: React.FC<ForecastViewProps> = ({ place, onBack, onClose }) => {
  const [data, setData] = useState<Forecast | null>(null);
  const [error, setError] = useState(false);
  const [day, setDay] = useState<0 | 1>(0);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lng}` +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
        '&hourly=temperature_2m,precipitation,weather_code,is_day&timezone=America%2FLima&forecast_days=5'
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
        return res.json();
      })
      .then((json: Forecast) => active && setData(json))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [place]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-5 pt-3 pb-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1565C0] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Lugares
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#1565C0] hover:bg-[#E3F2FD] cursor-pointer"
          aria-label="Cerrar pronóstico"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <h3 className="mt-1 text-xl font-bold text-[#111827]">{place.city}</h3>
      <p className="text-xs text-[#111827]">{place.region} · Pronóstico Open-Meteo</p>

      {error && (
        <p className="mt-6 text-sm text-center text-[#111827]">
          No se pudo cargar el pronóstico. Intente nuevamente en unos minutos.
        </p>
      )}
      {!data && !error && (
        <div className="mt-4" aria-hidden="true">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-3 w-8 rounded bg-[#E3F2FD] animate-pulse" />
                <div className="h-7 w-7 rounded-full bg-[#E3F2FD] animate-pulse" />
                <div className="h-3 w-10 rounded bg-[#E3F2FD] animate-pulse" />
              </div>
            ))}
          </div>
          <div className="mt-6 h-40 rounded-lg bg-[#E3F2FD] animate-pulse" />
          <p className="mt-3 text-center text-sm text-[#1565C0]" role="status">Cargando pronóstico…</p>
        </div>
      )}

      {data && (
        <>
          {/* Próximos 5 días */}
          <div className="mt-4 grid grid-cols-5 gap-1 text-center">
            {data.daily.time.map((date, i) => {
              const { Icon, color } = weatherIcon(data.daily.weather_code[i]);
              return (
                <div key={date} className="flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-[#111827]">
                    {WEEKDAYS[new Date(`${date}T12:00`).getDay()]}
                  </span>
                  <Icon className="w-7 h-7" style={{ color }} />
                  <span className="text-sm font-bold">
                    <span className="text-[#111827]">{Math.round(data.daily.temperature_2m_max[i])}°</span>{' '}
                    <span className="text-[#1565C0]">{Math.round(data.daily.temperature_2m_min[i])}°</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end gap-3 text-sm font-semibold">
            {(['Hoy', 'Mañana'] as const).map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setDay(i as 0 | 1)}
                className={`cursor-pointer ${day === i ? 'text-[#1565C0]' : 'text-[#111827] hover:text-[#111827]'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <HourlyChart data={data} day={day} />
        </>
      )}
    </div>
  );
};

// Gráfico de 24 horas: línea de temperatura, íconos cada 3 horas y barras de lluvia
const HourlyChart: React.FC<{ data: Forecast; day: 0 | 1 }> = ({ data, day }) => {
  const from = day * 24;
  const temps = data.hourly.temperature_2m.slice(from, from + 24);
  const rain = data.hourly.precipitation.slice(from, from + 24);
  const codes = data.hourly.weather_code.slice(from, from + 24);
  const isDay = data.hourly.is_day.slice(from, from + 24);

  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const maxRain = Math.max(2, ...rain);

  const x = (h: number) => ((h + 0.5) / 24) * 100;
  const yTemp = (t: number) => 38 + (1 - (t - minT) / (maxT - minT || 1)) * 30;
  const BASE = 86;

  const line = temps.map((t, h) => `${x(h)},${yTemp(t)}`).join(' ');

  return (
    <div className="mt-2">
      <div className="relative h-52">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" x2="100" y1={BASE} y2={BASE} stroke="#CBD5E1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {rain.map((mm, h) =>
            mm > 0 ? (
              <rect
                key={h}
                x={x(h) - 1.2}
                width="2.4"
                y={BASE - (mm / maxRain) * 16}
                height={(mm / maxRain) * 16}
                rx="0.6"
                fill="#1E88E5"
              />
            ) : null
          )}
          <polyline
            points={line}
            fill="none"
            stroke="#DC2626"
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Ícono y temperatura cada 3 horas */}
        {LABEL_HOURS.map((h) => {
          const { Icon, color } = weatherIcon(codes[h], isDay[h] === 1);
          return (
            <div
              key={h}
              className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center pb-1"
              style={{ left: `${x(h)}%`, top: `${yTemp(temps[h])}%` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
              <span className="text-xs font-bold text-[#111827]">{Math.round(temps[h])}°</span>
            </div>
          );
        })}

        {/* Valor de la lluvia sobre cada barra */}
        {rain.map((mm, h) =>
          mm >= 0.1 ? (
            <span
              key={h}
              className="absolute -translate-x-1/2 -translate-y-full text-xs font-bold text-[#1565C0]"
              style={{ left: `${x(h)}%`, top: `${BASE - (mm / maxRain) * 16}%` }}
            >
              {mm.toFixed(1)}
            </span>
          ) : null
        )}
      </div>

      <div className="relative h-4 text-xs text-[#111827]">
        {LABEL_HOURS.map((h) => (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: `${x(h)}%` }}>
            {String(h).padStart(2, '0')}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-[#111827]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[#DC2626] rounded" />
          Temperatura
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1E88E5]" />
          Precipitación (mm)
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Mapa de lluvias
// ---------------------------------------------------------------------------

interface PeruMapProps {
  stations: WeatherStation[];
  selectedStation: WeatherStation;
  onSelectStation: (station: WeatherStation) => void;
  heightClass?: string;
}

// Ícono de pantalla completa: esquinas arriba-izquierda y abajo-derecha, flechas hacia las otras dos
const FullscreenIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M4 4h5.5v2.6H6.6v2.9H4z" />
    <path d="M20 20h-5.5v-2.6h2.9v-2.9H20z" />
    <path d="M20 4v6.3l-2.3-2.3-3.7 3.7-1.7-1.7 3.7-3.7L13.7 4z" />
    <path d="M4 20v-6.3l2.3 2.3 3.7-3.7 1.7 1.7-3.7 3.7 2.3 2.3z" />
  </svg>
);

const LEGEND_ITEMS = [
  { color: RISK_COLOR.ALTO, label: 'Peligro', range: `> ${UMBRAL_ROJO_MM} mm` },
  { color: RISK_COLOR.MEDIO, label: 'Precaución', range: `${UMBRAL_NARANJA_MM}–${UMBRAL_ROJO_MM} mm` },
  { color: RISK_COLOR.BAJO, label: 'Normal', range: `< ${UMBRAL_NARANJA_MM} mm` },
];

const RISK_COLORS: Record<RiskLevel, { core: string; glow: string; label: string }> = {
  ALTO: {
    core: RISK_COLOR.ALTO,
    glow: 'rgba(239, 68, 68, 0.35)',
    label: 'Peligro',
  },
  MEDIO: {
    core: RISK_COLOR.MEDIO,
    glow: 'rgba(245, 158, 11, 0.32)',
    label: 'Precaución',
  },
  BAJO: {
    core: RISK_COLOR.BAJO,
    glow: 'rgba(34, 197, 94, 0.28)',
    label: 'Normal',
  },
};

export const PeruMap: React.FC<PeruMapProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  heightClass = 'h-[400px] sm:h-[480px] lg:h-[620px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const lastSelectedIdRef = useRef<string | null>(null);
  const placeLayerRef = useRef<L.LayerGroup | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [panelPlace, setPanelPlace] = useState<Place | null>(null);
  const [query, setQuery] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);

  const suggestions = PERU_PLACES.filter((p) => normalize(`${p.city} ${p.region}`).includes(normalize(query.trim())));

  // Pantalla completa: el mapa ocupa todo el monitor y permite zoom con la rueda del mouse
  useEffect(() => {
    const onChange = () => {
      const active = document.fullscreenElement === wrapperRef.current;
      setIsFullscreen(active);
      const map = mapInstanceRef.current;
      if (!map) return;
      if (active) map.scrollWheelZoom.enable();
      else map.scrollWheelZoom.disable();
      setTimeout(() => map.invalidateSize(), 150);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapperRef.current?.requestFullscreen();
  };

  // Lugar buscado: se centra el mapa y se marca con un pin
  const showPlace = (place: Place) => {
    const map = mapInstanceRef.current;
    const layer = placeLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    L.marker([place.lat, place.lng], {
      icon: L.divIcon({
        html: '<div style="width:18px;height:18px;border-radius:9999px;background:#1565C0;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);transform:translate(-50%,-50%)"></div>',
        className: 'place-marker',
        iconSize: [0, 0],
      }),
    })
      .bindTooltip(place.city, { direction: 'top', offset: [0, -10], permanent: true })
      .addTo(layer);
    map.flyTo([place.lat, place.lng], 8, { duration: 0.8 });
  };

  // Elegir una región desde el buscador: centra el mapa y abre su pronóstico
  const chooseRegion = (place: Place) => {
    showPlace(place);
    setPanelPlace(place);
    setSearchOpen(true);
    setQuery(place.region);
    setSuggestOpen(false);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setPanelPlace(null);
    setQuery('');
    placeLayerRef.current?.clearLayers();
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-9.3, -75.2],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      scrollWheelZoom: false,
      zoomControl: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    placeLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    markersRef.current.clear();

    stations.forEach((station) => {
      const palette = RISK_COLORS[station.riskLevel];
      const isSelected = station.id === selectedStation.id;

      // 1. Capas radiales concéntricas de calor
      const outerRadiusMeters = Math.max(75000, station.precipitationMm * 3400);
      const midRadiusMeters = outerRadiusMeters * 0.62;

      L.circle([station.lat, station.lng], {
        radius: outerRadiusMeters,
        color: 'transparent',
        fillColor: palette.core,
        fillOpacity: 0.22,
        interactive: false,
      }).addTo(layerGroup);

      L.circle([station.lat, station.lng], {
        radius: midRadiusMeters,
        color: 'transparent',
        fillColor: palette.core,
        fillOpacity: 0.36,
        interactive: false,
      }).addTo(layerGroup);

      // 2. Marcador interactivo
      const markerHtml = `
        <div style="
          position: relative;
          width: ${isSelected ? '32px' : '24px'};
          height: ${isSelected ? '32px' : '24px'};
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translate(-50%, -50%);
          cursor: pointer;
        ">
          <span style="
            position: absolute;
            inset: 0;
            border-radius: 9999px;
            background: ${palette.core};
            opacity: ${isSelected ? '0.45' : '0.25'};
            border: 2px solid ${isSelected ? '#0D47A1' : '#FFFFFF'};
          "></span>
          <span style="
            position: relative;
            width: ${isSelected ? '16px' : '12px'};
            height: ${isSelected ? '16px' : '12px'};
            border-radius: 9999px;
            background: ${palette.core};
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          "></span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-station-marker',
        iconSize: [0, 0],
      });

      const marker = L.marker([station.lat, station.lng], { icon: customIcon }).addTo(layerGroup);

      marker.bindPopup(`
        <div style="min-width: 190px; color: #111827; padding: 2px;">
          <div style="font-size: 13px; color: #1565C0; font-weight: 600; margin-bottom: 2px;">
            ${station.department} · ${station.region}
          </div>
          <div style="font-size: 13px; font-weight: 700; margin-bottom: 4px; color: #111827;">
            ${station.name}
          </div>
          <div style="border-top: 1px solid #E3F2FD; padding-top: 4px; font-size: 13px;">
            <span style="color: #111827; display: block;">Lluvia en 24 h</span>
            <strong style="color: #111827;">${station.precipitationMm.toFixed(1)} mm</strong>
          </div>
          <div style="margin-top: 4px; font-size: 13px; font-weight: 700; color: #111827;">
            Riesgo: ${palette.label}
          </div>
        </div>
      `);

      markersRef.current.set(station.id, marker);

      marker.on('click', () => {
        onSelectStation(station);
      });
    });
  }, [stations, selectedStation, onSelectStation]);

  // Al elegir otra estación el mapa vuela hasta ella y abre su globo de datos.
  // No se mueve al cargar la página ni cada vez que llegan datos nuevos.
  const { id: selectedId, lat: selectedLat, lng: selectedLng } = selectedStation;
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const previousId = lastSelectedIdRef.current;
    lastSelectedIdRef.current = selectedId;
    if (previousId === null) {
      // Al abrir la página solo se centra, sin acercar
      map.panTo([selectedLat, selectedLng], { animate: false });
      return;
    }
    if (previousId === selectedId) return;
    map.flyTo([selectedLat, selectedLng], Math.max(map.getZoom(), 7), { duration: 0.8 });
    markersRef.current.get(selectedId)?.openPopup();
  }, [selectedId, selectedLat, selectedLng]);

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full overflow-hidden bg-[#E3F2FD] ${
        isFullscreen ? 'h-full' : `${heightClass} rounded-xl border border-[#BBDEFB]`
      }`}
    >
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Controles superiores derechos: zoom y pantalla completa (o X para salir de ella) */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <div className="h-12 px-1 rounded-full bg-white shadow-md flex items-center text-[#1565C0]">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#E3F2FD] cursor-pointer"
            aria-label="Acercar"
            title="Acercar"
          >
            <Plus className="w-6 h-6" />
          </button>
          <span className="w-px h-6 bg-[#E2E8F0]" />
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#E3F2FD] cursor-pointer"
            aria-label="Alejar"
            title="Alejar"
          >
            <Minus className="w-6 h-6" />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-[#1565C0] hover:bg-[#E3F2FD] cursor-pointer"
          aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          <FullscreenIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Buscador de regiones, arriba a la izquierda dentro del mapa */}
      <div className="absolute top-3 left-3 right-[11.5rem] sm:right-auto sm:w-80 z-30">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && suggestions[0]) chooseRegion(suggestions[0]);
              if (e.key === 'Escape') setSuggestOpen(false);
            }}
            placeholder="Buscar región…"
            aria-label="Buscar región del Perú"
            className="w-full h-12 pl-11 pr-4 rounded-full bg-white shadow-md text-sm text-[#111827] placeholder-[#111827] focus:outline-none focus:ring-2 focus:ring-[#90CAF9]"
          />
          <Search className="w-5 h-5 text-[#1565C0] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {suggestOpen && (
          <ul className="mt-2 w-[min(20rem,calc(100vw-3rem))] max-h-64 overflow-y-auto bg-white rounded-xl shadow-xl border border-[#E3F2FD] divide-y divide-[#F1F5F9]">
            {suggestions.length === 0 ? (
              <li className="px-4 py-3 text-xs text-[#111827]">Sin resultados para “{query}”</li>
            ) : (
              suggestions.map((p) => (
                <li key={p.city}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => chooseRegion(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#E3F2FD] cursor-pointer"
                  >
                    <MapPin className="w-5 h-5 text-[#1565C0] shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-[#111827] truncate">{p.region}</span>
                      <span className="block text-xs text-[#1565C0] truncate">{p.city}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {searchOpen && (
        <PlaceWeather
          key={panelPlace?.city ?? 'lista'}
          initialPlace={panelPlace}
          onSelectPlace={showPlace}
          onClose={closeSearch}
        />
      )}

      {/* Leyenda plegable: un ícono pequeño que se despliega al hacer clic */}
      <div className="absolute bottom-3 left-3 z-30">
        {legendOpen ? (
          <div className="w-56 bg-white/95 backdrop-blur-sm border border-[#BBDEFB] rounded-xl shadow-lg text-xs text-[#111827] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#E3F2FD]">
              <span className="font-bold text-[#1565C0] uppercase tracking-wider text-xs">Leyenda</span>
              <button
                type="button"
                onClick={() => setLegendOpen(false)}
                className="p-1 -mr-1 rounded-md hover:bg-[#E3F2FD] cursor-pointer"
                aria-label="Cerrar leyenda"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-3 py-2.5">
              <ul className="space-y-1.5">
                {LEGEND_ITEMS.map(({ color, label, range }) => (
                  <li key={label} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-semibold">{label}</span>
                    <span className="ml-auto text-[#111827]">{range}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setLegendOpen(true)}
            className="w-11 h-11 rounded-xl bg-white border border-[#E3F2FD] shadow-md flex items-center justify-center text-[#1565C0] hover:bg-[#E3F2FD] cursor-pointer"
            aria-label="Ver leyenda"
            title="Ver leyenda"
          >
            <SwatchBook className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};
