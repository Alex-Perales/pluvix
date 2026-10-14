import type React from 'react';

export type RiskLevel = 'ALTO' | 'MEDIO' | 'BAJO';
export type NaturalRegion = 'Costa' | 'Sierra' | 'Selva';

export interface WeatherStation {
  id: string;
  name: string;
  department: string;
  province: string;
  region: NaturalRegion;
  lat: number;
  lng: number;
  precipitationMm: number;
  riskLevel: RiskLevel;
  updatedMinutesAgo: number;
  basin: string;
  thresholdRedMm: number;
}

export interface ActiveAlert {
  id: string;
  code: string;
  title: string;
  department: string;
  provinces: string[];
  region: NaturalRegion;
  severity: 'ROJA' | 'NARANJA';
  riskLevel: RiskLevel;
  issuedAt: string;
  validUntil: string;
  expectedRainfall: string;
  riverBasin: string;
  description: string;
  protocolSteps: string[];
  evacuationCenters: number;
}

export interface HistoricalAlert {
  id: string;
  date: string;
  region: string;
  naturalRegion: NaturalRegion;
  alertType: string;
  riskLevel: RiskLevel;
  recordedMm: string;
  station: string;
}

export interface NewsItem {
  id: string;
  title: string;
  date: string;
  source: string;
  summary: string;
  fullText: string[];
  imageUrl: string;
  regionTag: string;
  url?: string;
}

// Umbrales de lluvia acumulada en 24 h (los mismos en el mapa, las alertas y los gráficos)
export const UMBRAL_NARANJA_MM = 15;
export const UMBRAL_ROJO_MM = 35;

export const riskFor = (mm: number): RiskLevel =>
  mm > UMBRAL_ROJO_MM ? 'ALTO' : mm >= UMBRAL_NARANJA_MM ? 'MEDIO' : 'BAJO';

// Color de cada nivel: solo se usa en puntos, bordes y marcas de riesgo
export const RISK_COLOR: Record<RiskLevel, string> = {
  ALTO: '#EF4444',
  MEDIO: '#F59E0B',
  BAJO: '#22C55E',
};

// Ubicación de cada punto de monitoreo. La lluvia y el riesgo se completan con datos
// reales de Open-Meteo al cargar la página (ver data/weather.ts).
export const PERU_STATIONS: WeatherStation[] = [
  {
    id: 'est-piura-tambogrande',
    name: 'Estación Hidrometeorológica Tambogrande',
    department: 'Piura',
    province: 'Piura / Sullana',
    region: 'Costa',
    lat: -4.928,
    lng: -80.343,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca Hidrográfica del Río Piura',
    thresholdRedMm: 35.0,
  },
  {
    id: 'est-tumbes-tigre',
    name: 'Estación Hidrológica Cabo Inga - El Tigre',
    department: 'Tumbes',
    province: 'Tumbes / Zarumilla',
    region: 'Costa',
    lat: -3.758,
    lng: -80.456,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca Binacional Puyango-Tumbes',
    thresholdRedMm: 35.0,
  },
  {
    id: 'est-lambayeque-tinajones',
    name: 'Estación Bocatoma Raca Rumi - Chancay',
    department: 'Lambayeque',
    province: 'Chiclayo / Ferreñafe',
    region: 'Costa',
    lat: -6.641,
    lng: -79.418,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca Chancay-Lambayeque y Río La Leche',
    thresholdRedMm: 35.0,
  },
  {
    id: 'est-libertad-laredo',
    name: 'Estación Quirihuac - Valle Santa Catalina',
    department: 'La Libertad',
    province: 'Trujillo / Virú',
    region: 'Costa',
    lat: -8.089,
    lng: -78.891,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca del Río Moche y Quebrada San Ildefonso',
    thresholdRedMm: 35.0,
  },
  {
    id: 'est-lima-chosica',
    name: 'Estación Pluviométrica Chosica - Puente Caracol',
    department: 'Lima',
    province: 'Lima / Huarochirí',
    region: 'Costa',
    lat: -11.936,
    lng: -76.692,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca Media y Baja del Río Rímac',
    thresholdRedMm: 35.0,
  },
  {
    id: 'est-cajamarca-weberbauer',
    name: 'Estación Meteorológica Augusto Weberbauer',
    department: 'Cajamarca',
    province: 'Cajamarca / Jaén',
    region: 'Sierra',
    lat: -7.141,
    lng: -78.489,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Intercuenca Alto Marañón / Río Mashcón',
    thresholdRedMm: 35.0,
  },
  {
    id: 'est-huanuco-tingo',
    name: 'Estación Hidrológica Tingo María - Río Huallaga',
    department: 'Huánuco',
    province: 'Leoncio Prado / Huánuco',
    region: 'Sierra',
    lat: -9.295,
    lng: -75.998,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca Alta del Río Huallaga',
    thresholdRedMm: 35.0,
  },
  {
    id: 'est-cusco-pisac',
    name: 'Estación Hidrométrica Pisac - Valle Sagrado',
    department: 'Cusco',
    province: 'Calca / Urubamba',
    region: 'Sierra',
    lat: -13.422,
    lng: -71.847,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca del Río Vilcanota - Urubamba',
    thresholdRedMm: 35.0,
  },
  {
    id: 'est-arequipa-characato',
    name: 'Estación Puente del Diablo - Río Chili',
    department: 'Arequipa',
    province: 'Arequipa / Caylloma',
    region: 'Sierra',
    lat: -16.409,
    lng: -71.512,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca Quilca-Chili',
    thresholdRedMm: 35.0,
  },
  {
    id: 'est-puno-ramis',
    name: 'Estación Hidrológica Puente Ramis',
    department: 'Puno',
    province: 'Huancané / San Román',
    region: 'Sierra',
    lat: -15.252,
    lng: -69.873,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Vertiente del Lago Titicaca - Río Ramis',
    thresholdRedMm: 35.0,
  },
  {
    id: 'est-loreto-tamshiyacu',
    name: 'Estación Hidrológica Tamshiyacu - Amazonas',
    department: 'Loreto',
    province: 'Maynas / Alto Amazonas',
    region: 'Selva',
    lat: -4.004,
    lng: -73.161,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca del Río Amazonas - Tramo Iquitos',
    thresholdRedMm: 35.0,
  },
  {
    id: 'est-sanmartin-tarapoto',
    name: 'Estación Cumbaza - Bajo Mayo',
    department: 'San Martín',
    province: 'San Martín / Picota',
    region: 'Selva',
    lat: -6.487,
    lng: -76.369,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Subcuenca del Río Mayo y Bajo Huallaga',
    thresholdRedMm: 35.0,
  },
  {
    id: 'est-ucayali-pucallpa',
    name: 'Estación Hidrometeorológica Pucallpa',
    department: 'Ucayali',
    province: 'Coronel Portillo',
    region: 'Selva',
    lat: -8.379,
    lng: -74.553,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca Media del Río Ucayali',
    thresholdRedMm: 35.0,
  },

  // Puntos de monitoreo de referencia en la capital de los demás departamentos
  {
    id: 'pto-amazonas',
    name: 'Punto de monitoreo Chachapoyas',
    department: 'Amazonas',
    province: 'Chachapoyas',
    region: 'Selva',
    lat: -6.2317,
    lng: -77.869,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca del Río Utcubamba',
    thresholdRedMm: 35.0,
  },
  {
    id: 'pto-ancash',
    name: 'Punto de monitoreo Huaraz',
    department: 'Áncash',
    province: 'Huaraz',
    region: 'Sierra',
    lat: -9.5278,
    lng: -77.5278,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca del Río Santa',
    thresholdRedMm: 35.0,
  },
  {
    id: 'pto-apurimac',
    name: 'Punto de monitoreo Abancay',
    department: 'Apurímac',
    province: 'Abancay',
    region: 'Sierra',
    lat: -13.6339,
    lng: -72.8814,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca del Río Pachachaca',
    thresholdRedMm: 35.0,
  },
  {
    id: 'pto-ayacucho',
    name: 'Punto de monitoreo Ayacucho',
    department: 'Ayacucho',
    province: 'Huamanga',
    region: 'Sierra',
    lat: -13.1588,
    lng: -74.2239,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca del Río Cachi',
    thresholdRedMm: 35.0,
  },
  {
    id: 'pto-callao',
    name: 'Punto de monitoreo Callao',
    department: 'Callao',
    province: 'Callao',
    region: 'Costa',
    lat: -12.0566,
    lng: -77.1181,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca Baja del Río Rímac',
    thresholdRedMm: 35.0,
  },
  {
    id: 'pto-huancavelica',
    name: 'Punto de monitoreo Huancavelica',
    department: 'Huancavelica',
    province: 'Huancavelica',
    region: 'Sierra',
    lat: -12.7861,
    lng: -74.9758,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca del Río Ichu',
    thresholdRedMm: 35.0,
  },
  {
    id: 'pto-ica',
    name: 'Punto de monitoreo Ica',
    department: 'Ica',
    province: 'Ica',
    region: 'Costa',
    lat: -14.0678,
    lng: -75.7286,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca del Río Ica',
    thresholdRedMm: 35.0,
  },
  {
    id: 'pto-junin',
    name: 'Punto de monitoreo Huancayo',
    department: 'Junín',
    province: 'Huancayo',
    region: 'Sierra',
    lat: -12.0651,
    lng: -75.2049,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca del Río Mantaro',
    thresholdRedMm: 35.0,
  },
  {
    id: 'pto-madrededios',
    name: 'Punto de monitoreo Puerto Maldonado',
    department: 'Madre de Dios',
    province: 'Tambopata',
    region: 'Selva',
    lat: -12.5933,
    lng: -69.1891,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca del Río Madre de Dios',
    thresholdRedMm: 35.0,
  },
  {
    id: 'pto-moquegua',
    name: 'Punto de monitoreo Moquegua',
    department: 'Moquegua',
    province: 'Mariscal Nieto',
    region: 'Costa',
    lat: -17.1956,
    lng: -70.9353,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca del Río Moquegua',
    thresholdRedMm: 35.0,
  },
  {
    id: 'pto-pasco',
    name: 'Punto de monitoreo Cerro de Pasco',
    department: 'Pasco',
    province: 'Pasco',
    region: 'Sierra',
    lat: -10.6864,
    lng: -76.2625,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca Alta del Río Huallaga',
    thresholdRedMm: 35.0,
  },
  {
    id: 'pto-tacna',
    name: 'Punto de monitoreo Tacna',
    department: 'Tacna',
    province: 'Tacna',
    region: 'Costa',
    lat: -18.0066,
    lng: -70.2463,
    precipitationMm: 0,
    riskLevel: 'BAJO',
    updatedMinutesAgo: 0,
    basin: 'Cuenca del Río Caplina',
    thresholdRedMm: 35.0,
  },
];

// ---------------------------------------------------------------------------
// Líneas de emergencia
// ---------------------------------------------------------------------------

// Páginas oficiales de cada línea de emergencia
export const EMERGENCY_SITES = {
  '115': 'https://www.gob.pe/indeci',
  '116': 'https://portal.bomberosperu.gob.pe/',
  '105': 'https://www.gob.pe/pnp',
  '106': 'https://www.gob.pe/samu',
} as const;

// En celular el botón llama al número; en computadora no hay con qué llamar,
// así que abre la página oficial de la institución.
export const openOfficialSiteOnDesktop = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  e.preventDefault();
  window.open(href, '_blank', 'noopener,noreferrer');
};
