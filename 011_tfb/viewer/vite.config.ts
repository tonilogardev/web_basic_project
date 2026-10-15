import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import fs from 'fs'
import path from 'path'

// Vite plugin para servir los ficheros estáticos de PMTiles simulando el volumen de Docker
const servePmtilesPlugin = (): Plugin => ({
  name: 'serve-pmtiles',
  configureServer(server: ViteDevServer) {
    server.middlewares.use('/data', (req: IncomingMessage, res: ServerResponse, next: () => void) => {

      const cleanPath = (req.url || '').split('?')[0].replace(/^\//, '');
      if (!cleanPath) return next();

      const candidateDirs = [
        '/dades/antonio/tfb/inference_model',
        path.resolve(__dirname, '../visualizations/SCL_UNET_catalonia')
      ];

      let targetPath: string | null = null;
      for (const dir of candidateDirs) {
        const p = path.resolve(dir, cleanPath);
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          targetPath = p;
          break;
        }
      }

      if (!targetPath) {
        return next();
      }

      const stat = fs.statSync(targetPath);
      const totalSize = stat.size;
      const isJson = targetPath.endsWith('.json');
      const contentType = isJson ? 'application/json' : 'application/octet-stream';

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Accept-Ranges, Content-Type');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      res.setHeader('Accept-Ranges', 'bytes');

      const rangeHeader = req.headers.range;
      if (rangeHeader && !isJson) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (isNaN(start) || start >= totalSize || end < start) {
          res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
          return res.end();
        }

        const actualEnd = Math.min(end, totalSize - 1);
        const chunkSize = actualEnd - start + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${actualEnd}/${totalSize}`,
          'Content-Length': chunkSize,
          'Content-Type': contentType
        });

        fs.createReadStream(targetPath, { start, end: actualEnd }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': totalSize,
          'Content-Type': contentType
        });
        fs.createReadStream(targetPath).pipe(res);
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

