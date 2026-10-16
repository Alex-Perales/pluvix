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
  pages/
    Inicio.tsx  Mapa.tsx  Alertas.tsx  Noticias.tsx
```

## Publicar en AWS

1. **Página** (S3 + CloudFront o Amplify):
   - S3 + CloudFront: `npm run build` genera la carpeta `dist/`, que se sube tal cual a un bucket S3; CloudFront sirve ese bucket por HTTPS. Opcional: Route 53 + ACM para dominio propio.
   - Amplify Hosting (más simple): conectar el repo de GitHub; Amplify corre `npm run build` y publica `dist/` en cada push, con HTTPS y CDN incluidos.
2. **Noticias** (Lambda + API Gateway): `api/noticias.ts` exporta `handler`.
   Crear una Lambda con Node.js 20+ (rol de ejecución básico, solo necesita `AWSLambdaBasicExecutionRole` para logs en CloudWatch) y dos rutas GET en API Gateway: `/noticias` y `/nota`, ambas apuntando a esa Lambda.
3. **Conectar ambas**: antes de `npm run build`, crear un archivo `.env` con la URL de API Gateway:

   ```
   VITE_API_URL=https://xxxxxx.execute-api.us-east-1.amazonaws.com
   ```

Sin `.env`, la página usa `/api`, que solo existe con `npm run dev`.

```
Usuario → CloudFront/Amplify (dist/) → React en el navegador
                                          │
                                          ├─ Open-Meteo API (directo, sin AWS)
                                          └─ VITE_API_URL → API Gateway → Lambda (noticias.ts) → gob.pe
```

No se necesita RDS, DynamoDB, SNS, SES ni Cognito: el sitio no guarda datos de usuarios ni envía notificaciones, solo consulta Open-Meteo (directo desde el navegador) y gob.pe (vía la Lambda).
