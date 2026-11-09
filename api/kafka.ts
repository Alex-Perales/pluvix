// Conexión a Apache Kafka, compartida por alertas.ts (productor) y notificador.ts (consumidor).
// Sin KAFKA_USERNAME se conecta sin cifrado (broker local); con él usa SSL + SASL/PLAIN.

import { Kafka, logLevel } from 'kafkajs';
import type { Escalada } from './alertas.ts';

export const TOPIC = process.env.KAFKA_TOPIC ?? 'pluvix.alertas';
const conClave = Boolean(process.env.KAFKA_USERNAME);

export const kafka = new Kafka({
  clientId: 'pluvix',
  brokers: process.env.KAFKA_BROKERS!.split(','),
  ssl: conClave,
  sasl: conClave
    ? { mechanism: 'plain', username: process.env.KAFKA_USERNAME!, password: process.env.KAFKA_PASSWORD! }
    : undefined,
  logLevel: logLevel.WARN,
});

// Un mensaje por revisión, con todas sus alertas: cada suscriptor recibe un solo correo.
export async function publicarAlertas(escaladas: Escalada[]) {
  const producer = kafka.producer();
  await producer.connect();
  try {
    await producer.send({ topic: TOPIC, messages: [{ value: JSON.stringify(escaladas) }] });
  } finally {
    await producer.disconnect();
  }
}
