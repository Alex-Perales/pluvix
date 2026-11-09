// Aviso por correo cuando una estación supera el umbral de lluvia.
//
// A diferencia de noticias.ts, esta función no la llama el navegador: la ejecuta
// una regla programada de EventBridge (por ejemplo, cada 15 min) directamente sobre
// la Lambda. En cada corrida:
//   1. consulta la lluvia real de las 24 h en Open-Meteo (igual que src/data/weather.ts);
//   2. compara el nivel de riesgo de cada estación con el último que se notificó
//      (guardado en un objeto JSON en S3, para no enviar el mismo aviso cada 15 min);
//   3. si alguna estación entra o sube a Precaución/Peligro, le envía un correo por SES
//      a cada suscriptor confirmado (ver api/db.ts y api/suscripciones.ts).

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import {
  PERU_STATIONS,
  PROTOCOL_STEPS,
  riskFor,
  UMBRAL_NARANJA_MM,
  UMBRAL_ROJO_MM,
  type RiskLevel,
} from '../src/data/stations.ts';
import { listarConfirmados, type Suscriptor } from './db.ts';

const REGION = process.env.AWS_REGION ?? 'us-east-1';
const BUCKET = process.env.STATE_BUCKET!;
const STATE_KEY = 'estado-alertas.json';
const CORREO_DESDE = process.env.SES_FROM!;
// URL pública de este API Gateway (la misma que usa suscripciones.ts), para el enlace de baja
const API_URL = process.env.API_URL!;
// URL pública de la página (Amplify); se puede sobrescribir con la variable de entorno PAGE_URL
const SITE_URL = process.env.PAGE_URL ?? 'https://main.d1kvur8mu9ge35.amplifyapp.com/';

const s3 = new S3Client({ region: REGION });
const ses = new SESv2Client({ region: REGION });

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

interface Escalada {
  estacion: (typeof PERU_STATIONS)[number];
  mm: number;
  nivel: RiskLevel;
}

const NOMBRE_NIVEL: Record<'ALTO' | 'MEDIO', string> = { ALTO: 'Peligro', MEDIO: 'Precaución' };

function textoCorreo(escaladas: Escalada[]) {
  const lineas = escaladas.map(
    (e) =>
      `- ${e.estacion.department} (${e.estacion.name}): ${e.mm.toFixed(1)} mm en 24 h → ${
        e.nivel === 'ALTO' ? 'PELIGRO' : 'PRECAUCIÓN'
      }`
  );

  // Pasos a seguir: solo los niveles que realmente aparecen en esta notificación
  const nivelesPresentes = new Set(escaladas.map((e) => e.nivel));
  const pasos = (['ALTO', 'MEDIO'] as const)
    .filter((nivel) => nivelesPresentes.has(nivel))
    .map(
      (nivel) =>
        `Si el nivel es ${NOMBRE_NIVEL[nivel]}:\n` + PROTOCOL_STEPS[nivel].map((paso) => `  • ${paso}`).join('\n')
    )
    .join('\n\n');

  return (
    `Pluvix detectó lluvia por encima del umbral en ${escaladas.length} estación(es):\n\n` +
    `${lineas.join('\n')}\n\n` +
    `Umbrales (acumulado 24 h): Precaución ≥ ${UMBRAL_NARANJA_MM} mm · Peligro > ${UMBRAL_ROJO_MM} mm.\n\n` +
    `Qué hacer (recomendaciones de Defensa Civil):\n${pasos}\n\n` +
    `Más detalle en Pluvix: ${SITE_URL}`
  );
}

async function enviarCorreo(escaladas: Escalada[], destinatarios: Suscriptor[]) {
  const asunto = `Pluvix: ${escaladas.length === 1 ? 'nueva alerta' : 'nuevas alertas'} de lluvia`;
  const cuerpo = textoCorreo(escaladas);

  // Un correo por suscriptor: cada uno lleva su propio enlace de baja
  await Promise.all(
    destinatarios.map((suscriptor) => {
      const baja = `${API_URL}/baja?correo=${encodeURIComponent(suscriptor.email)}&token=${suscriptor.token}`;
      return ses.send(
        new SendEmailCommand({
          FromEmailAddress: CORREO_DESDE,
          Destination: { ToAddresses: [suscriptor.email] },
          Content: {
            Simple: {
              Subject: { Data: asunto },
              Body: { Text: { Data: `${cuerpo}\n\nDarte de baja de estas alertas: ${baja}` } },
            },
          },
        })
      );
    })
  );
}

export async function revisarYNotificar() {
  const [lecturas, estadoAnterior, suscriptores] = await Promise.all([
    lluviaPorEstacion(),
    leerEstado(),
    listarConfirmados(),
  ]);

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

  if (escaladas.length > 0 && suscriptores.length > 0) await enviarCorreo(escaladas, suscriptores);
  await guardarEstado(estadoNuevo);

  return { revisadas: lecturas.length, notificadas: escaladas.length, suscriptores: suscriptores.length };
}

// Punto de entrada para AWS Lambda (disparada por una regla programada de EventBridge,
// sin evento HTTP de por medio)
export const handler = async () => {
  const resultado = await revisarYNotificar();
  console.log('Revisión de umbrales:', resultado);
  return resultado;
};
