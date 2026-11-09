// Tabla de suscriptores (DynamoDB). La usan api/suscripciones.ts (suscribir, confirmar,
// dar de baja) y api/alertas.ts (saber a quién avisar cuando se supera un umbral).
// Un correo solo recibe alertas una vez que confirma el enlace que se le envía.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'node:crypto';

const REGION = process.env.AWS_REGION ?? 'us-east-1';
const TABLA = process.env.SUSCRIPTORES_TABLE!;

const cliente = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

export type EstadoSuscripcion = 'pendiente' | 'confirmado';

export interface Suscriptor {
  email: string;
  estado: EstadoSuscripcion;
  token: string;
  creadoEn: string;
  confirmadoEn?: string;
}

const normalizar = (correo: string) => correo.trim().toLowerCase();

export const esCorreoValido = (correo: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());

export async function obtenerSuscriptor(correo: string): Promise<Suscriptor | null> {
  const res = await cliente.send(new GetCommand({ TableName: TABLA, Key: { email: normalizar(correo) } }));
  return (res.Item as Suscriptor | undefined) ?? null;
}

// Crea la suscripción en estado "pendiente" (o la reemplaza si ya existía una pendiente,
// con un token nuevo) a la espera de que confirme desde el correo.
export async function crearPendiente(correo: string): Promise<Suscriptor> {
  const suscriptor: Suscriptor = {
    email: normalizar(correo),
    estado: 'pendiente',
    token: randomBytes(24).toString('hex'),
    creadoEn: new Date().toISOString(),
  };
  await cliente.send(new PutCommand({ TableName: TABLA, Item: suscriptor }));
  return suscriptor;
}

export async function confirmar(correo: string, token: string): Promise<boolean> {
  const actual = await obtenerSuscriptor(correo);
  if (!actual || actual.token !== token) return false;
  await cliente.send(
    new UpdateCommand({
      TableName: TABLA,
      Key: { email: actual.email },
      UpdateExpression: 'SET estado = :confirmado, confirmadoEn = :fecha',
      ExpressionAttributeValues: { ':confirmado': 'confirmado', ':fecha': new Date().toISOString() },
    })
  );
  return true;
}

export async function darDeBaja(correo: string, token: string): Promise<boolean> {
  const actual = await obtenerSuscriptor(correo);
  if (!actual || actual.token !== token) return false;
  await cliente.send(new DeleteCommand({ TableName: TABLA, Key: { email: actual.email } }));
  return true;
}

export async function listarConfirmados(): Promise<Suscriptor[]> {
  // Tabla pequeña (suscripción de una comunidad, no millones de usuarios): un Scan
  // es suficiente y evita tener que mantener un índice solo para esto.
  const res = await cliente.send(
    new ScanCommand({
      TableName: TABLA,
      FilterExpression: 'estado = :confirmado',
      ExpressionAttributeValues: { ':confirmado': 'confirmado' },
    })
  );
  return (res.Items as Suscriptor[] | undefined) ?? [];
}
