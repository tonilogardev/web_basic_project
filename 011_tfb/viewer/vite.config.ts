import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'

// Vite plugin para servir los ficheros estáticos de PMTiles simulando el volumen de Docker
const servePmtilesPlugin = () => ({
  name: 'serve-pmtiles',
  configureServer(server) {
    server.middlewares.use('/data', (req, res, next) => {
      const filePath = path.resolve(__dirname, '../visualizations/SCL_UNET_catalonia', req.url.slice(1));
      if (fs.existsSync(filePath)) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/octet-stream');
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
      } else {
        next();
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), servePmtilesPlugin()],
  server: {
    port: 5173,
    cors: true
  }
})
