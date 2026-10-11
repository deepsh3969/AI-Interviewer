import { z } from 'zod';
import {
  RateLimiter,
  clientIp,
  fail,
  json,
  methodNotAllowed,
  readJsonBody,
  type ApiHandler,
} from '../server/http';
import { speechConfig } from '../server/env';

/**
 * Optional remote speech-to-text.
 *
 * Only used when a provider key (SPEECH_API_KEY) is configured server-side.
 * Audio is only transmitted after the user explicitly opts in in the UI.
 * Without a configured provider this endpoint answers 503 and the app keeps
 * using browser speech recognition or typed answers.
 */

const limiter = new RateLimiter(60_000, 8);

const MAX_AUDIO_CHARS = 3_500_000; // base64 characters (~2.5 MB)

const ALLOWED_MIME = [
  'audio/webm',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/ogg;codecs=opus',
];

const bodySchema = z.object({
  audio: z.string().min(16).max(MAX_AUDIO_CHARS),
  mimeType: z.string().min(3).max(80),
  language: z.string().min(2).max(12).optional().default('en-US'),
});

const handler: ApiHandler = async (req, res) => {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const ip = clientIp(req);
  if (limiter.check(ip)) {
    res.setHeader('Retry-After', '60');
    return fail(res, 429, 'rate_limited', 'Too many transcription requests. Try again in a minute.');
  }

  const body = await readJsonBody(req, 4 * 1024 * 1024);
  if (!body.ok) {
    return fail(
      res,
      body.reason === 'too_large' ? 413 : 400,
      body.reason === 'too_large' ? 'audio_too_large' : 'invalid_request',
      body.reason === 'too_large' ? 'Audio upload is too large.' : 'Request body must be valid JSON.',
    );
  }

  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) {
    return fail(res, 400, 'invalid_request', 'Transcription request failed validation.');
  }

  const baseMimeType = parsed.data.mimeType.split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MIME.includes(baseMimeType)) {
    return fail(res, 415, 'unsupported_audio', 'Unsupported audio format.');
  }

  const speech = speechConfig();
  if (!speech.configured) {
    return fail(
      res,
      503,
      'speech_not_configured',
      'No transcription provider is configured. Use browser speech recognition or type your answer.',
    );
  }

  const provider = speech.provider ?? 'deepgram';
  if (provider !== 'deepgram') {
    return fail(res, 503, 'speech_not_configured', 'The configured transcription provider is not supported.');
  }

  const endpoint =
    process.env.SPEECH_ENDPOINT ?? `https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=${encodeURIComponent(parsed.data.language.slice(0, 5))}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Token ${process.env.SPEECH_API_KEY}`,
        'Content-Type': baseMimeType,
      },
      body: Buffer.from(parsed.data.audio, 'base64'),
    });

    if (!upstream.ok) {
      const detail = (await upstream.text().catch(() => '')).slice(0, 200);
      if (upstream.status === 401 || upstream.status === 403) {
        return fail(res, 503, 'speech_not_configured', 'The transcription provider rejected the configured credentials.');
      }
      if (upstream.status === 429) {
        res.setHeader('Retry-After', '30');
        return fail(res, 429, 'rate_limited', 'The transcription provider is rate limited.');
      }
      return fail(res, 502, 'upstream_error', 'The transcription provider failed.', { detail });
    }

    const data = (await upstream.json()) as {
      results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
    };
    const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
    if (!text.trim()) {
      return json(res, 200, { text: '', provider, note: 'No speech detected in the recording.' });
    }
    return json(res, 200, { text: text.trim(), provider });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      res.setHeader('Retry-After', '10');
      return fail(res, 504, 'upstream_timeout', 'The transcription provider timed out.');
    }
    return fail(res, 502, 'upstream_error', 'The transcription provider could not be reached.');
  } finally {
    clearTimeout(timer);
  }
};

export default handler;
