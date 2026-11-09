# Pluvix

Plataforma de alerta temprana de lluvias ante el Fenómeno de El Niño en el Perú.
Muestra la lluvia real de los 25 departamentos (Open-Meteo), genera alertas por umbral
y reúne las noticias oficiales del Estado (gob.pe).

## Ejecutar en local

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Estructura

```
api/
  noticias.ts        Funciones de noticias (gob.pe). En local las usa Vite; en AWS es la Lambda.
  alertas.ts         Revisa los umbrales y avisa por correo a cada suscriptor. Lambda programada (EventBridge).
  suscripciones.ts   Suscribir / confirmar / dar de baja un correo. Lambda detrás de API Gateway.
  db.ts              Acceso a la tabla de suscriptores (DynamoDB), compartido por alertas.ts y suscripciones.ts.
  mail.ts            Envío de correo por Gmail SMTP, compartido por alertas.ts y suscripciones.ts.
public/
  media/             Video de portada, imagen, logo e ícono de la pestaña.
src/
  main.tsx           Arranque de React.
  App.tsx            Navegación entre páginas y estado compartido.
  index.css          Tipografía, tamaños y estilos del mapa.
  data/
    stations.ts      Departamentos, umbrales de alerta, colores de riesgo y líneas de emergencia.
    weather.ts       Lluvia real de Open-Meteo y dirección de la API de noticias.
  components/
    Layout.tsx       Menú superior y pie de página.
    PeruMap.tsx      Mapa con buscador de regiones y pronóstico.
    RainChart.tsx    Gráfico de vigilancia por departamento.
    ui.tsx           Ícono de alerta y estados de carga y error.
    SubscribeForm.tsx  Botón "Recibir alertas por correo" (Centro de Alertas).
  pages/
    Inicio.tsx  Mapa.tsx  Alertas.tsx  Noticias.tsx
```

## Publicar en AWS

1. **Página** (S3 + CloudFront o Amplify):
   - S3 + CloudFront: `npm run build` genera la carpeta `dist/`, que se sube tal cual a un bucket S3; CloudFront sirve ese bucket por HTTPS. Opcional: Route 53 + ACM para dominio propio.
   - Amplify Hosting (más simple): conectar el repo de GitHub; Amplify corre `npm run build` y publica `dist/` en cada push, con HTTPS y CDN incluidos.
2. **Noticias + suscripciones** (Lambda + API Gateway): `api/noticias.ts` y `api/suscripciones.ts` exportan cada
   uno su `handler`. En el mismo API Gateway HTTP API, agregar estas rutas (todas apuntando a la Lambda que
   corresponda):
   - `GET /noticias`, `GET /nota` → Lambda de `noticias.ts` (rol básico, solo `AWSLambdaBasicExecutionRole`).
   - `POST /suscribir`, `GET /confirmar`, `GET /baja` → Lambda de `suscripciones.ts` (ver permisos en el punto 4).
3. **Conectar con la página**: antes de `npm run build`, crear un archivo `.env` con la URL de API Gateway:

   ```
   VITE_API_URL=https://xxxxxx.execute-api.us-east-1.amazonaws.com
   ```

Sin `.env`, la página usa `/api`, que solo existe con `npm run dev` (y ahí solo responden las rutas de noticias:
suscribirse necesita AWS real, así que el botón solo funciona una vez desplegado).

```
Usuario → CloudFront/Amplify (dist/) → React en el navegador
                                          │
                                          ├─ Open-Meteo API (directo, sin AWS)
                                          └─ VITE_API_URL → API Gateway ─┬─ Lambda (noticias.ts) → gob.pe
                                                                         └─ Lambda (suscripciones.ts) → Gmail SMTP + DynamoDB

EventBridge (cada 15 min) → Lambda (alertas.ts) → Open-Meteo (lluvia) + S3 (último nivel por estación)
                                                  + DynamoDB (suscriptores confirmados) → Gmail SMTP → un correo por suscriptor
```

No se necesita RDS ni Cognito: el sitio no guarda datos de usuarios, salvo la lista de correos suscritos
(DynamoDB) y un JSON chico en S3 con el último nivel de riesgo notificado por estación, para no reenviar el
mismo aviso cada 15 minutos.

> **Por qué Gmail y no Amazon SES:** en cuentas de laboratorio (AWS Academy / Vocareum, el típico rol
> `assumed-role/voclabs/...`) el permiso `ses:*` normalmente está bloqueado y no se puede cambiar. Enviar por
> SMTP a Gmail es tráfico de red común, no una llamada a la API de AWS, así que no depende de ningún permiso
> de IAM y funciona igual en una cuenta de laboratorio o en una cuenta propia. Si más adelante usas una cuenta
> de AWS sin esa restricción, se podría volver a SES para enviar a mayor volumen sin depender de una cuenta de
> Gmail — pero para este proyecto, con pocos suscriptores, Gmail es más que suficiente.

4. **Alertas por correo y suscripción pública** (Lambdas + S3 + DynamoDB + Gmail SMTP):
   - **Compilar**: `npm run build:alertas` y `npm run build:suscripciones` generan `dist-lambda/alertas/index.js`
     y `dist-lambda/suscripciones/index.js` (cada uno con el AWS SDK, `nodemailer` y `src/data/stations.ts`
     empaquetados), listos para subir a cada Lambda tal cual, por ejemplo con `zip`.
   - **Gmail**: en la cuenta `pluvixap@gmail.com`, activar la verificación en 2 pasos (*Cuenta de Google →
     Seguridad*) y generar una "contraseña de aplicación" en https://myaccount.google.com/apppasswords. Esa
     contraseña (no la normal de la cuenta) es `GMAIL_APP_PASSWORD` más abajo.
   - **DynamoDB**: crear una tabla (p. ej. `pluvix-suscriptores`) con clave de partición `email` (tipo *String*).
   - **S3**: crear (o reutilizar) un bucket para guardar `estado-alertas.json` (un objeto pequeño, sin costo real).
   - **Rol de ejecución de las Lambdas**: en una cuenta de laboratorio normalmente no se puede crear un rol de
     IAM nuevo — usar el rol ya existente (suele llamarse `LabRole`), que ya trae permisos para Lambda, S3,
     DynamoDB y CloudWatch Logs. En una cuenta propia, crear un rol con `AWSLambdaBasicExecutionRole` +
     `s3:GetObject`/`s3:PutObject` sobre el bucket + `dynamodb:Scan`/`GetItem`/`PutItem`/`UpdateItem`/`DeleteItem`
     sobre la tabla (ya no hace falta ningún permiso de `ses:*`).
   - **Lambda `alertas.ts`** (programada, Node.js 20+): subir `dist-lambda/alertas/index.js` como `index.handler`.
     Variables de entorno:
     ```
     STATE_BUCKET=<nombre del bucket>
     SUSCRIPTORES_TABLE=pluvix-suscriptores
     GMAIL_USER=pluvixap@gmail.com
     GMAIL_APP_PASSWORD=<la contraseña de aplicación de 16 caracteres>
     API_URL=https://xxxxxx.execute-api.us-east-1.amazonaws.com   (el mismo API Gateway del punto 2)
     PAGE_URL=https://main.d1kvur8mu9ge35.amplifyapp.com/         (opcional; es el valor por defecto)
     ```
     **Programación**: en *Amazon EventBridge → Scheduler*, crear una regla con tasa fija (p. ej.
     `rate(15 minutes)`) que invoque esta Lambda.
   - **Lambda `suscripciones.ts`** (detrás de API Gateway, Node.js 20+): subir `dist-lambda/suscripciones/index.js`
     como `index.handler`. Mismas variables `SUSCRIPTORES_TABLE`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `API_URL`
     y `PAGE_URL` (no necesita `STATE_BUCKET`).
   - Los umbrales, el texto de cada nivel y las recomendaciones de "qué hacer" son los mismos que usa la página
     (`UMBRAL_NARANJA_MM`, `UMBRAL_ROJO_MM` y `PROTOCOL_STEPS` en `src/data/stations.ts`): cambiarlos ahí y volver a
     compilar y subir la Lambda `alertas.ts` los actualiza en ambos lados.

   **Flujo de suscripción:**
   1. La persona escribe su correo en el botón "Recibir alertas por correo" (Centro de Alertas) → `POST /suscribir`
      la guarda como *pendiente* y le envía un correo con un enlace de confirmación.
   2. Hace clic en ese enlace → `GET /confirmar` la pasa a *confirmada*. Desde ahí empieza a recibir avisos.
   3. Cada correo de alerta trae, al final, un enlace "Darte de baja" → `GET /baja` la elimina de la tabla.

   **Correo de alerta que recibe cada suscriptor** (texto plano):
     ```
     Pluvix detectó lluvia por encima del umbral en 1 estación(es):

     - Piura (Estación Hidrometeorológica Tambogrande): 38.4 mm en 24 h → PELIGRO

     Umbrales (acumulado 24 h): Precaución ≥ 15 mm · Peligro > 35 mm.

     Qué hacer (recomendaciones de Defensa Civil):
     Si el nivel es Peligro:
       • Aléjese de ríos, quebradas y badenes; no intente cruzarlos a pie ni en vehículo.
       • Si vive en una zona baja o junto a un cauce, evacúe hacia la zona segura indicada por su municipalidad.
       • Tenga lista su mochila de emergencia y siga las indicaciones de Defensa Civil (línea 115).

     Más detalle en Pluvix: https://main.d1kvur8mu9ge35.amplifyapp.com/

     Darte de baja de estas alertas: https://xxxxxx.execute-api.us-east-1.amazonaws.com/baja?correo=...&token=...
     ```
