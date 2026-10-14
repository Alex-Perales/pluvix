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

1. **Página** (S3 + CloudFront o Amplify): `npm run build` genera la carpeta `dist/`, que se sube tal cual.
2. **Noticias** (Lambda + API Gateway): `api/noticias.ts` exporta `handler`.
   Crear una Lambda con Node.js 20+ y dos rutas GET en API Gateway: `/noticias` y `/nota`.
3. **Conectar ambas**: antes de `npm run build`, crear un archivo `.env` con la URL de API Gateway:

   ```
   VITE_API_URL=https://xxxxxx.execute-api.us-east-1.amazonaws.com
   ```

Sin `.env`, la página usa `/api`, que solo existe con `npm run dev`.
