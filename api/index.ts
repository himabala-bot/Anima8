import type { IncomingMessage, ServerResponse } from 'http';
import { handleApiRequest } from '../src/server/api';

export default async function handler(req: any, res: any) {
  // CORS & Preflight handling
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const url = req.url || '/api/health';
    const method = req.method || 'GET';
    const body = req.body;
    const headers = req.headers as Record<string, string | undefined>;

    const result = await handleApiRequest(url, method, body, headers);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    console.error('API Handler Error on Vercel:', error);
    res.status(500).json({ error: error?.message || 'Internal Server Error' });
  }
}
