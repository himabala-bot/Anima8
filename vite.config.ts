import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

function neonApiPlugin(): Plugin {
  return {
    name: 'neon-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        try {
          const { handleApiRequest } = await import('./src/server/api');
          let body: any = null;

          if (req.method === 'POST' || req.method === 'PUT') {
            const chunks: Uint8Array[] = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            const rawBody = Buffer.concat(chunks).toString('utf-8');
            if (rawBody) {
              try {
                body = JSON.parse(rawBody);
              } catch {
                body = rawBody;
              }
            }
          }

          const response = await handleApiRequest(req.url, req.method || 'GET', body);
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(response.data));
        } catch (err: any) {
          console.error('Server API error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || 'Server error' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), neonApiPlugin()],
  server: {
    port: 3000,
    open: false,
  },
});
