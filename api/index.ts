import { handleApiRequest } from '../src/server/api';

// Safe body parser for Vercel Node runtime
async function parseBody(req: any): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return req.body;
      }
    }
    return req.body;
  }

  // If request is a readable stream
  if (typeof req.on === 'function') {
    return new Promise((resolve) => {
      let raw = '';
      req.on('data', (chunk: any) => {
        raw += chunk;
      });
      req.on('end', () => {
        if (!raw) {
          resolve(undefined);
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(raw);
        }
      });
      req.on('error', () => resolve(undefined));
    });
  }

  return undefined;
}

// Universal response sender supporting both Express-style and standard Node HTTP
function sendResponse(res: any, status: number, data: any) {
  // CORS Headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers':
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  };

  for (const [key, value] of Object.entries(headers)) {
    if (typeof res.setHeader === 'function') {
      res.setHeader(key, value);
    }
  }

  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(status).json(data);
    return;
  }

  res.statusCode = status;
  res.end(JSON.stringify(data));
}

export default async function handler(req: any, res: any) {
  // Handle preflight CORS OPTIONS
  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      res.status(200).end();
    } else {
      res.statusCode = 200;
      res.end();
    }
    return;
  }

  try {
    // Resolve URL path
    let url = req.url || '/api/health';
    if (req.query?.path) {
      const pathSegment = Array.isArray(req.query.path)
        ? req.query.path.join('/')
        : req.query.path;
      url = `/api/${pathSegment}`;
    } else if (req.query?.slug) {
      const pathSegment = Array.isArray(req.query.slug)
        ? req.query.slug.join('/')
        : req.query.slug;
      url = `/api/${pathSegment}`;
    } else if (!url.startsWith('/api')) {
      url = `/api${url.startsWith('/') ? '' : '/'}${url}`;
    }

    const method = req.method || 'GET';
    const body = await parseBody(req);
    const headers = (req.headers || {}) as Record<string, string | undefined>;

    const result = await handleApiRequest(url, method, body, headers);
    sendResponse(res, result.status, result.data);
  } catch (error: any) {
    console.error('Fatal Serverless API Error:', error);
    sendResponse(res, 500, {
      error: error?.message || 'Internal Server Error',
    });
  }
}
