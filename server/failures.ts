import { ProviderError } from './ai.js';
import { fail, type ApiResponse } from './http.js';

const FAILURE_MAP: Record<string, { status: number; code: string; message: string; headers?: Record<string, string> }> = {
  not_configured: {
    status: 503,
    code: 'ai_not_configured',
    message: 'No AI provider is configured on this deployment. Set LLM_API_KEY on the server to enable AI generation.',
  },
  rate_limited: {
    status: 429,
    code: 'rate_limited',
    message: 'The AI provider is rate limited. Try again shortly.',
    headers: { 'Retry-After': '30' },
  },
  timeout: {
    status: 504,
    code: 'upstream_timeout',
    message: 'The AI provider took too long to respond.',
  },
  upstream: {
    status: 502,
    code: 'upstream_error',
    message: 'The AI provider returned an error.',
  },
  upstream_auth: {
    status: 503,
    code: 'ai_not_configured',
    message: 'The configured AI credentials were rejected by the provider. Check LLM_API_KEY / LLM_ENDPOINT.',
  },
  bad_output: {
    status: 502,
    code: 'upstream_error',
    message: 'The AI provider returned output that failed validation.',
  },
};

/** Translate a provider failure into a safe, non-leaking API error response. */
export function respondProviderFailure(res: ApiResponse, err: unknown): void {
  if (err instanceof ProviderError) {
    const mapped = FAILURE_MAP[err.failure] ?? FAILURE_MAP.upstream;
    for (const [key, value] of Object.entries(mapped.headers ?? {})) res.setHeader(key, value);
    fail(res, mapped.status, mapped.code, mapped.message);
    return;
  }
  fail(res, 500, 'server_error', 'Unexpected server error.');
}
