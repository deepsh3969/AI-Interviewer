import type { z } from 'zod';
import { aiConfig } from './env';

export type ProviderFailure =
  | 'not_configured'
  | 'rate_limited'
  | 'timeout'
  | 'upstream'
  | 'upstream_auth'
  | 'bad_output';

export class ProviderError extends Error {
  constructor(
    readonly failure: ProviderFailure,
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

interface ChatJsonArgs<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
  temperature?: number;
}

interface ChatJsonResult<T> {
  data: T;
  model: string;
  attempts: number;
}

const JSON_ONLY =
  'Respond with a single JSON object only. No markdown fences, no commentary, no trailing text.';

function extractJson(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) cleaned = cleaned.slice(first, last + 1);
  return cleaned;
}

/**
 * Call an OpenAI-compatible chat completions endpoint and validate the JSON
 * response against a zod schema. Retries once with a corrective instruction
 * when the model returns malformed JSON.
 */
export async function chatJson<T>(args: ChatJsonArgs<T>): Promise<ChatJsonResult<T>> {
  const cfg = aiConfig();
  if (!cfg.configured || !cfg.apiKey) {
    throw new ProviderError('not_configured', 'No AI provider key is configured on this server.');
  }

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: `${args.system}\n${JSON_ONLY}` },
    { role: 'user', content: args.user },
  ];

  let lastFailure: ProviderError | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    let res: Response;
    try {
      res = await fetch(cfg.endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          temperature: args.temperature ?? 0.5,
          max_tokens: args.maxTokens,
          messages,
        }),
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ProviderError('timeout', 'The AI provider timed out.');
      }
      throw new ProviderError('upstream', 'Could not reach the AI provider.');
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      if (res.status === 401 || res.status === 403) {
        throw new ProviderError('upstream_auth', 'The AI provider rejected the configured credentials.', detail);
      }
      if (res.status === 429) {
        throw new ProviderError('rate_limited', 'The AI provider is rate limited.', detail);
      }
      throw new ProviderError('upstream', `The AI provider returned status ${res.status}.`, detail);
    }

    const payload = (await res.json().catch(() => null)) as
      | { choices?: { message?: { content?: string } }[]; model?: string }
      | null;
    const content = payload?.choices?.[0]?.message?.content ?? '';
    if (!content) {
      lastFailure = new ProviderError('bad_output', 'The AI provider returned an empty response.');
      messages.push({ role: 'user', content: 'Your previous reply was empty. Return the JSON object now.' });
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(content));
    } catch {
      lastFailure = new ProviderError('bad_output', 'The AI provider returned malformed JSON.');
      messages.push({
        role: 'user',
        content: 'That was not valid JSON. Return only a valid JSON object matching the requested structure.',
      });
      continue;
    }

    const result = args.schema.safeParse(parsed);
    if (!result.success) {
      lastFailure = new ProviderError(
        'bad_output',
        'The AI provider returned JSON that failed validation.',
        result.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      );
      messages.push({
        role: 'assistant',
        content: JSON.stringify(parsed).slice(0, 4000),
      });
      messages.push({
        role: 'user',
        content: `Your JSON failed validation: ${lastFailure.detail ?? 'unknown error'}. Return a corrected JSON object only.`,
      });
      continue;
    }

    return { data: result.data, model: payload?.model ?? cfg.model, attempts: attempt };
  }

  throw lastFailure ?? new ProviderError('bad_output', 'The AI provider returned unusable output.');
}
