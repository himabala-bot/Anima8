import { handleApiRequest } from './api';

// Safe body parser for Node runtime
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

// Universal response sender for Node ServerResponse
function sendNodeResponse(res: any, status: number, data: any) {
  if (!res) return;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers':
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  };

  for (const [key, value] of Object.entries(headers)) {
    try {
      if (typeof res.setHeader === 'function') {
        res.setHeader(key, value);
      }
    } catch {}
  }

  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(status).json(data);
    return;
  }

  res.statusCode = status;
  res.end(JSON.stringify(data));
}

export default async function handler(req: any, res?: any) {
  // 1. WEB STANDARD / FETCH API MODE (when res is undefined)
  if (!res && req && (typeof req.json === 'function' || typeof req.text === 'function' || req instanceof Request)) {
    try {
      const request = req as Request;
      const parsedUrl = new URL(request.url, 'http://localhost');
      let pathname = parsedUrl.pathname;
      const method = request.method || 'GET';

      if (method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
          },
        });
      }

      let body: any = undefined;
      if (method !== 'GET' && method !== 'HEAD') {
        try {
          body = await request.json();
        } catch {
          body = await request.text().catch(() => undefined);
        }
      }

      const headers: Record<string, string | undefined> = {};
      request.headers.forEach((val, key) => {
        headers[key] = val;
      });

      const forwardedUrl = headers['x-matched-path'] || headers['x-forwarded-url'];
      if (forwardedUrl && forwardedUrl.startsWith('/api')) {
        pathname = forwardedUrl;
      }

      const result = await handleApiRequest(pathname, method, body, headers);

      return new Response(JSON.stringify(result.data), {
        status: result.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
        },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err?.message || 'Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 2. NODE HTTP SERVERLESS MODE (req, res)
  if (req?.method === 'OPTIONS') {
    if (typeof res?.status === 'function') {
      res.status(200).end();
    } else if (res) {
      res.statusCode = 200;
      res.end();
    }
    return;
  }

  try {
    const forwardedUrl = (req?.headers?.['x-matched-path'] || req?.headers?.['x-forwarded-url'] || '') as string;
    let url = (forwardedUrl && forwardedUrl.startsWith('/api')) ? forwardedUrl : (req?.url || '/api/health');

    if (req?.query?.path) {
      const pathSegment = Array.isArray(req.query.path)
        ? req.query.path.join('/')
        : req.query.path;
      url = `/api/${pathSegment}`;
    } else if (!url.startsWith('/api')) {
      url = `/api${url.startsWith('/') ? '' : '/'}${url}`;
    }

    const method = req?.method || 'GET';
    const body = await parseBody(req);
    const headers = (req?.headers || {}) as Record<string, string | undefined>;

    const result = await handleApiRequest(url, method, body, headers);
    sendNodeResponse(res, result.status, result.data);
    return result.data;
  } catch (error: any) {
    console.error('Fatal Serverless API Error:', error);
    sendNodeResponse(res, 500, {
      error: error?.message || 'Internal Server Error',
    });
    return { error: error?.message || 'Internal Server Error' };
  }
}
