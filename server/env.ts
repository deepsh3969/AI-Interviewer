import { z } from 'zod';

/**
 * Environment validation. Secrets are read here only and are never sent to
 * the browser or written to logs.
 */
const envSchema = z.object({
  LLM_API_KEY: z.string().min(1).optional(),
  LLM_ENDPOINT: z.string().url().optional(),
  LLM_MODEL: z.string().min(1).max(120).optional(),
  LLM_TIMEOUT_MS: z.coerce.number().int().min(2000).max(60_000).optional(),
  SPEECH_PROVIDER: z.enum(['deepgram']).optional(),
  SPEECH_API_KEY: z.string().min(1).optional(),
  SPEECH_ENDPOINT: z.string().url().optional(),
  NODE_ENV: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: { env: Env; issues: string[] } | null = null;

/** Test hook: forget the cached environment so mutated process.env is re-read. */
export function resetEnvCache(): void {
  cached = null;
}

export function getEnv(): { env: Env; issues: string[] } {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) {
    cached = { env: parsed.data, issues: [] };
  } else {
    const fallback = envSchema.parse({});
    cached = {
      env: { ...fallback, ...(pickValid(process.env) as Partial<Env>) },
      issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }
  return cached;
}

function pickValid(source: NodeJS.ProcessEnv): Partial<Env> {
  const out: Record<string, unknown> = {};
  for (const key of ['LLM_API_KEY', 'LLM_ENDPOINT', 'LLM_MODEL', 'LLM_TIMEOUT_MS', 'SPEECH_PROVIDER', 'SPEECH_API_KEY', 'SPEECH_ENDPOINT', 'NODE_ENV']) {
    const value = source[key];
    if (typeof value === 'string' && value.length > 0) out[key] = key === 'LLM_TIMEOUT_MS' ? Number(value) : value;
  }
  return out as Partial<Env>;
}

export interface AiConfig {
  configured: boolean;
  endpoint: string;
  model: string;
  apiKey: string | null;
  timeoutMs: number;
}

export const DEFAULT_LLM_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
export const DEFAULT_LLM_MODEL = 'gpt-4o-mini';

export function aiConfig(): AiConfig {
  const { env } = getEnv();
  const apiKey = env.LLM_API_KEY ?? null;
  return {
    configured: Boolean(apiKey),
    endpoint: env.LLM_ENDPOINT ?? DEFAULT_LLM_ENDPOINT,
    model: env.LLM_MODEL ?? DEFAULT_LLM_MODEL,
    apiKey,
    timeoutMs: env.LLM_TIMEOUT_MS ?? 35_000,
  };
}

export function speechConfig(): { configured: boolean; provider: string | null } {
  const { env } = getEnv();
  if (!env.SPEECH_API_KEY) return { configured: false, provider: null };
  return { configured: true, provider: env.SPEECH_PROVIDER ?? 'deepgram' };
}
