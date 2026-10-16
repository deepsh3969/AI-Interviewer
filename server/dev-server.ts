/**
 * Local development API server.
 *
 * Exposes the same handlers that deploy as Vercel serverless functions under
 * /api, so the interview engine can be exercised locally without Vercel.
 *
 *   npm run dev:api        # http://localhost:8787
 *   npm run dev            # Vite dev server proxies /api here
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import statusHandler from '../api/status.js';
import questionsHandler from '../api/questions.js';
import evaluateHandler from '../api/evaluate.js';
import transcribeHandler from '../api/transcribe.js';
import type { ApiHandler, ApiRequest } from './http.js';

const PORT = Number(process.env.API_PORT ?? 8787);
const MAX_BODY = 4 * 1024 * 1024;

interface Route {
  method: string;
  handler: ApiHandler;
}

const routes: Record<string, Route[]> = {
  '/api/status': [{ method: 'GET', handler: statusHandler }],
  '/api/questions': [{ method: 'POST', handler: questionsHandler }],
  '/api/evaluate': [{ method: 'POST', handler: evaluateHandler }],
  '/api/transcribe': [{ method: 'POST', handler: transcribeHandler }],
};

async function parseBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > MAX_BODY) throw new Error('payload_too_large');
    chunks.push(buf);
  }
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const matched = routes[url.pathname];

  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!matched) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: { code: 'not_found', message: `No route for ${url.pathname}` } }));
    return;
  }

  const route = matched.find((r) => r.method === req.method) ?? matched[0];
  if (route.method !== req.method) {
    res.statusCode = 405;
    res.setHeader('Allow', matched.map((m) => m.method).join(', '));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: { code: 'method_not_allowed', message: 'Method not allowed.' } }));
    return;
  }

  const apiReq = req as ApiRequest;
  try {
    if (req.method === 'POST') {
      apiReq.body = await parseBody(req);
    }
  } catch (err) {
    const tooLarge = err instanceof Error && err.message === 'payload_too_large';
    res.statusCode = tooLarge ? 413 : 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: { code: tooLarge ? 'audio_too_large' : 'invalid_request', message: tooLarge ? 'Body too large.' : 'Invalid JSON body.' },
      }),
    );
    return;
  }

  try {
    await route.handler(apiReq, res);
  } catch (err) {
    console.error('API handler failed:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: { code: 'server_error', message: 'Unexpected server error.' } }));
    } else {
      res.end();
    }
  }
});

server.listen(PORT, () => {
  console.log(`AI Interviewer Pro API listening on http://localhost:${PORT}`);
});
