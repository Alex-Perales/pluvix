// Publica en Kafka un evento cuando una estación supera el umbral de lluvia.
//
// A diferencia de noticias.ts, esta función no la llama el navegador: la ejecuta
// una regla programada de EventBridge (por ejemplo, cada 15 min) directamente sobre
// la Lambda. En cada corrida:
//   1. consulta la lluvia real de las 24 h en Open-Meteo (igual que src/data/weather.ts);
//   2. compara el nivel de riesgo de cada estación con el último que se notificó
//      (guardado en un objeto JSON en S3, para no enviar el mismo aviso cada 15 min);
//   3. si alguna estación entra o sube a Precaución/Peligro, publica el evento en Kafka
//      (ver api/kafka.ts); api/notificador.ts lo consume y envía los correos.

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PERU_STATIONS, riskFor, type RiskLevel } from '../src/data/stations.ts';
import { publicarAlertas } from './kafka.ts';

const REGION = process.env.AWS_REGION ?? 'us-east-1';
const BUCKET = process.env.STATE_BUCKET!;
const STATE_KEY = 'estado-alertas.json';

const s3 = new S3Client({ region: REGION });

// Último nivel notificado por estación: evita reenviar el mismo aviso en cada corrida
type Estado = Record<string, RiskLevel>;

async function leerEstado(): Promise<Estado> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: STATE_KEY }));
    const texto = await res.Body?.transformToString();
    return texto ? (JSON.parse(texto) as Estado) : {};
  } catch {
    return {}; // primera corrida: todavía no hay estado guardado
  }
}

async function guardarEstado(estado: Estado) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: STATE_KEY,
      Body: JSON.stringify(estado),
      ContentType: 'application/json',
    })
  );
}

interface RainResponse {
  hourly: { precipitation: (number | null)[] };
}

async function lluviaPorEstacion() {
  const lat = PERU_STATIONS.map((s) => s.lat).join(',');
  const lng = PERU_STATIONS.map((s) => s.lng).join(',');
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=precipitation&past_hours=24&forecast_hours=0&timezone=GMT`
  );
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
  const datos = (await res.json()) as RainResponse[];
  return PERU_STATIONS.map((estacion, i) => ({
    estacion,
    mm: Math.round(datos[i].hourly.precipitation.reduce<number>((suma, v) => suma + (v ?? 0), 0) * 10) / 10,
  }));
}

const PESO_NIVEL: Record<RiskLevel, number> = { BAJO: 0, MEDIO: 1, ALTO: 2 };

export interface Escalada {
  estacion: (typeof PERU_STATIONS)[number];
  mm: number;
  nivel: RiskLevel;
}

export async function revisarYNotificar() {
  const [lecturas, estadoAnterior] = await Promise.all([lluviaPorEstacion(), leerEstado()]);

  const estadoNuevo: Estado = {};
  const escaladas: Escalada[] = [];

  for (const { estacion, mm } of lecturas) {
    const nivel = riskFor(mm);
    estadoNuevo[estacion.id] = nivel;

    const nivelAnterior = estadoAnterior[estacion.id] ?? 'BAJO';
    if (nivel !== 'BAJO' && PESO_NIVEL[nivel] > PESO_NIVEL[nivelAnterior]) {
      escaladas.push({ estacion, mm, nivel });
    }
  }

  if (escaladas.length > 0) await publicarAlertas(escaladas);
  await guardarEstado(estadoNuevo);

  return { revisadas: lecturas.length, notificadas: escaladas.length };
}

// Punto de entrada para AWS Lambda (disparada por una regla programada de EventBridge,
// sin evento HTTP de por medio)
export const handler = async () => {
  const resultado = await revisarYNotificar();
  console.log('Revisión de umbrales:', resultado);
  return resultado;
};
