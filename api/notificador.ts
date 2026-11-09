// Consumidor de Kafka: por cada mensaje del tópico de alertas, envía un correo a cada
// suscriptor confirmado. Es un proceso continuo (EC2 o PC), no una Lambda.

import { PROTOCOL_STEPS, UMBRAL_NARANJA_MM, UMBRAL_ROJO_MM } from '../src/data/stations.ts';
import type { Escalada } from './alertas.ts';
import { listarConfirmados } from './db.ts';
import { kafka, TOPIC } from './kafka.ts';
import { enviarCorreo } from './mail.ts';

const API_URL = process.env.API_URL!;
const SITE_URL = process.env.PAGE_URL ?? 'https://main.d1kvur8mu9ge35.amplifyapp.com/';
const NOMBRE_NIVEL = { ALTO: 'Peligro', MEDIO: 'Precaución' } as const;

function textoCorreo(escaladas: Escalada[]) {
  const lineas = escaladas.map(
    (e) =>
      `- ${e.estacion.department} (${e.estacion.name}): ${e.mm.toFixed(1)} mm en 24 h → ${
        e.nivel === 'ALTO' ? 'PELIGRO' : 'PRECAUCIÓN'
      }`
  );

  // Pasos a seguir: solo los niveles que realmente aparecen en esta notificación
  const presentes = new Set(escaladas.map((e) => e.nivel));
  const pasos = (['ALTO', 'MEDIO'] as const)
    .filter((nivel) => presentes.has(nivel))
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

async function main() {
  const consumer = kafka.consumer({ groupId: 'pluvix-notificador-correo' });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });
  console.log(`Notificador escuchando el tópico ${TOPIC}`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      const escaladas = JSON.parse(message.value!.toString()) as Escalada[];
      const asunto = `Pluvix: ${escaladas.length === 1 ? 'nueva alerta' : 'nuevas alertas'} de lluvia`;
      const cuerpo = textoCorreo(escaladas);
      const suscriptores = await listarConfirmados();

      // allSettled: un correo fallido no debe provocar el reenvío de la alerta a todos
      const envios = await Promise.allSettled(
        suscriptores.map((s) => {
          const baja = `${API_URL}/baja?correo=${encodeURIComponent(s.email)}&token=${s.token}`;
          return enviarCorreo(s.email, asunto, `${cuerpo}\n\nDarte de baja de estas alertas: ${baja}`);
        })
      );
      const fallidos = envios.filter((e) => e.status === 'rejected').length;
      console.log(`Alerta procesada: ${envios.length - fallidos} enviados, ${fallidos} fallidos`);
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
