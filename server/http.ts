import type { IncomingMessage, ServerResponse } from 'node:http';

export type ApiRequest = IncomingMessage & { body?: unknown };
export type ApiResponse = ServerResponse;
export type ApiHandler = (req: ApiRequest, res: ApiResponse) => void | Promise<void>;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    [key: string]: unknown;
  };
}

export function setSecurityHeaders(res: ApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
}

export function json(res: ApiResponse, status: number, body: unknown): void {
  setSecurityHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export function fail(
  res: ApiResponse,
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): void {
  const body: ApiErrorBody = { error: { code, message, ...extra } };
  json(res, status, body);
}

export function methodNotAllowed(res: ApiResponse, allow: string[]): void {
  setSecurityHeaders(res);
  res.setHeader('Allow', allow.join(', '));
  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: { code: 'method_not_allowed', message: `Use ${allow.join(' or ')}.` } }));
}

const MAX_BODY_BYTES = 3 * 1024 * 1024;

/** Returns the parsed JSON body or a typed failure reason. */
export async function readJsonBody(
  req: ApiRequest,
  maxBytes = MAX_BODY_BYTES,
): Promise<{ ok: true; value: unknown } | { ok: false; reason: 'too_large' | 'invalid' }> {
  if (req.body !== undefined) {
    return { ok: true, value: req.body };
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > maxBytes) return { ok: false, reason: 'too_large' };
    chunks.push(buf);
  }
  if (size === 0) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

export function clientIp(req: ApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

/** Best-effort in-memory sliding-window rate limiter (per server instance). */
export class RateLimiter {
  private readonly hits = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
  ) {}

  /** Returns true when the key is over the limit. */
  check(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || now - entry.start > this.windowMs) {
      this.hits.set(key, { start: now, count: 1 });
      return false;
    }
    entry.count += 1;
    if (this.hits.size > 10_000) this.hits.clear();
    return entry.count > this.max;
  }

  reset(): void {
    this.hits.clear();
  }
}

export function clampText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}
