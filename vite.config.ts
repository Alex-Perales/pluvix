import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { responder } from './api/noticias.ts';

// En local, el propio servidor de Vite atiende /api/noticias y /api/nota
// con las mismas funciones que se publican en AWS Lambda.
const apiLocal = (): Plugin => ({
  name: 'api-local',
  configureServer(server) {
    server.middlewares.use('/api', async (req, res) => {
      const url = new URL(req.url ?? '', 'http://localhost');
      const { status, body } = await responder(url.pathname, url.searchParams.get('url'));
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(body);
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), apiLocal()],
});
