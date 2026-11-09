// Envío de correo por Gmail SMTP (nodemailer).
//
// En cuentas de laboratorio (AWS Academy / Vocareum) el rol del estudiante no tiene permiso
// para usar Amazon SES (ses:*), así que en vez de pedirle a AWS que mande el correo, la Lambda
// se conecta directo a Gmail por SMTP — es tráfico de red normal, no una llamada a la API de AWS,
// así que no depende de ningún permiso de IAM.
//
// Requiere una cuenta de Gmail con verificación en 2 pasos activada y una "contraseña de
// aplicación" generada en https://myaccount.google.com/apppasswords (nunca la contraseña
// normal de la cuenta).

import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER!;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD!;

const transportador = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

export async function enviarCorreo(para: string, asunto: string, texto: string) {
  await transportador.sendMail({ from: `Pluvix <${GMAIL_USER}>`, to: para, subject: asunto, text: texto });
}
