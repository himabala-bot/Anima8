import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { handleApiRequest } from '../../src/server/api';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Credentials': 'true',
};

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  // 1. Handle CORS preflight options request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // 2. Normalize incoming path:
    // When redirected from /api/* -> /.netlify/functions/api/:splat,
    // event.path might be "/.netlify/functions/api/projects" or "/api/projects".
    let path = event.path || '/api/health';
    if (path.startsWith('/.netlify/functions/api')) {
      path = path.replace('/.netlify/functions/api', '/api');
    }

    // Attach raw query string if present
    const query = event.rawQuery ? `?${event.rawQuery}` : '';
    const fullUrl = `${path}${query}`;

    const method = event.httpMethod || 'GET';

    // Parse JSON body if present
    let parsedBody: any = undefined;
    if (event.body) {
      try {
        parsedBody = JSON.parse(event.body);
      } catch {
        parsedBody = event.body;
      }
    }

    // Normalize incoming headers to lowercase
    const normalizedHeaders: Record<string, string | undefined> = {};
    if (event.headers) {
      for (const [key, value] of Object.entries(event.headers)) {
        if (value !== undefined) {
          normalizedHeaders[key.toLowerCase()] = value;
        }
      }
    }

    // 3. Dispatch to core API router
    const result = await handleApiRequest(fullUrl, method, parsedBody, normalizedHeaders);

    return {
      statusCode: result.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result.data),
    };
  } catch (error: any) {
    console.error('Netlify API Function Error:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ok: false,
        error: error?.message || 'Internal Server Error in Netlify Function',
      }),
    };
  }
};
