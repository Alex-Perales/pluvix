// Suscripción pública a las alertas por correo (botón "Recibir alertas por correo" en la web).
// Lambda detrás de API Gateway, igual que noticias.ts, con tres rutas:
//
//   POST /suscribir                 body {"correo": "..."} → crea la suscripción (pendiente)
//                                    y envía el correo de confirmación
//   GET  /confirmar?correo=&token=  activa la suscripción (clic desde ese correo)
//   GET  /baja?correo=&token=       da de baja (clic desde el pie de cada alerta)
//
// Nadie empieza a recibir alertas sin hacer clic en el enlace de confirmación: así
// evitamos que alguien suscriba el correo de otra persona sin su permiso.

import { confirmar, crearPendiente, darDeBaja, esCorreoValido, obtenerSuscriptor } from './db.ts';
import { enviarCorreo } from './mail.ts';

// URL pública de este API Gateway: para armar los enlaces de confirmación y de baja del correo
const API_URL = process.env.API_URL!;
const SITE_URL = process.env.PAGE_URL ?? 'https://main.d1kvur8mu9ge35.amplifyapp.com/';

async function enviarConfirmacion(correo: string, token: string) {
  const enlace = `${API_URL}/confirmar?correo=${encodeURIComponent(correo)}&token=${token}`;
  await enviarCorreo(
    correo,
    'Confirma tu suscripción a las alertas de Pluvix',
    `Pediste recibir en este correo las alertas de lluvia de Pluvix.\n\n` +
      `Para confirmar, abre este enlace:\n${enlace}\n\n` +
      `Si no fuiste tú, ignora este correo: no se activará ninguna suscripción.`
  );
}

const paginaHtml = (mensaje: string) =>
  `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
  `<body style="font-family:system-ui,sans-serif;max-width:420px;margin:15vh auto;text-align:center;color:#111827">` +
  `<p>${mensaje}</p><p><a href="${SITE_URL}" style="color:#1565C0">Volver a Pluvix</a></p></body></html>`;

export async function responder(
  ruta: string,
  metodo: string,
  query: Record<string, string | undefined> | null | undefined,
  cuerpo: string | null | undefined
): Promise<{ status: number; headers?: Record<string, string>; body: string }> {
  try {
    if (ruta.endsWith('/suscribir') && metodo === 'POST') {
      const correo = (cuerpo ? (JSON.parse(cuerpo) as { correo?: string }).correo : query?.correo) ?? '';
      if (!esCorreoValido(correo)) {
        return { status: 400, body: JSON.stringify({ error: 'Ingresa un correo válido.' }) };
      }

      const existente = await obtenerSuscriptor(correo);
      if (existente?.estado === 'confirmado') {
        return { status: 200, body: JSON.stringify({ mensaje: 'Este correo ya está suscrito a las alertas.' }) };
      }

      const suscriptor = await crearPendiente(correo);
      await enviarConfirmacion(suscriptor.email, suscriptor.token);
      return { status: 200, body: JSON.stringify({ mensaje: 'Revisa tu correo y confirma la suscripción.' }) };
    }

    if (ruta.endsWith('/confirmar') && metodo === 'GET') {
      const ok = await confirmar(query?.correo ?? '', query?.token ?? '');
      return {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: paginaHtml(ok ? 'Listo, quedaste suscrito a las alertas de Pluvix.' : 'El enlace de confirmación no es válido.'),
      };
    }

    if (ruta.endsWith('/baja') && metodo === 'GET') {
      const ok = await darDeBaja(query?.correo ?? '', query?.token ?? '');
      return {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: paginaHtml(ok ? 'Listo, ya no recibirás más alertas de Pluvix.' : 'El enlace no es válido.'),
      };
    }

    return { status: 404, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
  } catch (error) {
    return { status: 502, body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) };
  }
}

// Punto de entrada para AWS Lambda (API Gateway, HTTP API)
export const handler = async (event: {
  rawPath?: string;
  path?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
  body?: string | null;
  requestContext?: { http?: { method?: string } };
  httpMethod?: string;
}) => {
  const metodo = event.requestContext?.http?.method ?? event.httpMethod ?? 'GET';
  const { status, headers, body } = await responder(
    event.rawPath ?? event.path ?? '',
    metodo,
    event.queryStringParameters,
    event.body
  );
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', ...headers },
    body,
  };
};
