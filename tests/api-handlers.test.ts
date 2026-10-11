import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import statusHandler from '../api/status';
import questionsHandler from '../api/questions';
import evaluateHandler from '../api/evaluate';
import transcribeHandler from '../api/transcribe';
import { resetEnvCache } from '../server/env';
import { rubricForQuestion } from '../src/lib/rubrics';
import type { ApiRequest, ApiResponse, ApiHandler } from '../server/http';
import { makeConfig, makeQuestions, LONG_ANSWER } from './helpers';

interface MockRes {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  ended: boolean;
  setHeader(key: string, value: string | number): void;
  end(chunk?: string): MockRes;
}

function mockRes(): MockRes {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    ended: false,
    setHeader(key: string, value: string | number) {
      this.headers[String(key).toLowerCase()] = String(value);
    },
    end(chunk?: string) {
      this.ended = true;
      if (typeof chunk === 'string') {
        try {
          this.body = JSON.parse(chunk);
        } catch {
          this.body = chunk;
        }
      }
      return this;
    },
  };
  return res;
}

let ipCounter = 0;
function mockReq(method: string, body?: unknown, ip = `10.0.0.${++ipCounter}`): ApiRequest {
  return {
    method,
    headers: { 'x-forwarded-for': ip, 'content-type': 'application/json' },
    socket: { remoteAddress: ip },
    body,
  } as unknown as ApiRequest;
}

async function call(handler: ApiHandler, method: string, body?: unknown, ip?: string) {
  const res = mockRes();
  await handler(mockReq(method, body, ip), res as unknown as ApiResponse);
  return res as MockRes & { body: { error?: { code?: string; message?: string }; [k: string]: unknown } };
}

function openAiResponse(content: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }],
      model: 'test-model',
    }),
    text: async () => '',
  };
}

const validQuestionsPayload = (count: number) => ({
  questions: Array.from({ length: count }, (_, i) => ({
    text: `Tell me about a time you improved a system in situation number ${i + 1}.`,
    category: 'behavioral',
    difficulty: 'medium',
    skill: 'Ownership',
    criteria: [{ label: 'STAR structure' }, { label: 'Measurable result' }],
    answerStructure: ['Situation', 'Action', 'Result'],
    timeLimitSeconds: 180,
  })),
});

const validEvaluationPayload = {
  overall: 71,
  dimensions: [
    { id: 'relevance', score: 75, evidence: 'The answer addresses the caching question directly here.' },
    { id: 'clarity', score: 70, evidence: 'Sentences are short, readable and well punctuated here.' },
    { id: 'structure', score: 68, evidence: 'Sequencing words connect the steps in order here.' },
  ],
  strengths: ['Clear structure'],
  weaknesses: ['Missing metrics'],
  missing: ['A quantified result'],
  suggestions: ['Add one number'],
  modelAnswerOutline: ['Context', 'Action', 'Result'],
  followUp: 'What measurable result did that change produce?',
};

describe('API handlers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_ENDPOINT;
    delete process.env.SPEECH_API_KEY;
    resetEnvCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnvCache();
    vi.unstubAllGlobals();
  });

  describe('GET /api/status', () => {
    it('reports AI as unconfigured without leaking secrets', async () => {
      const res = await call(statusHandler, 'GET');
      expect(res.statusCode).toBe(200);
      expect(res.body.aiConfigured).toBe(false);
      expect(res.body.model).toBeNull();
      expect(JSON.stringify(res.body)).not.toMatch(/api[_-]?key/i);
    });

    it('reports the configured model name only', async () => {
      process.env.LLM_API_KEY = 'sk-super-secret-value';
      process.env.LLM_MODEL = 'my-model';
      resetEnvCache();
      const res = await call(statusHandler, 'GET');
      expect(res.body.aiConfigured).toBe(true);
      expect(res.body.model).toBe('my-model');
      expect(JSON.stringify(res.body)).not.toContain('sk-super-secret-value');
    });

    it('rejects other methods', async () => {
      const res = await call(statusHandler, 'POST');
      expect(res.statusCode).toBe(405);
    });
  });

  describe('POST /api/questions', () => {
    it('returns 400 for an invalid configuration', async () => {
      const res = await call(questionsHandler, 'POST', { config: { role: '' } });
      expect(res.statusCode).toBe(400);
      expect(res.body.error?.code).toBe('invalid_request');
      expect(Array.isArray((res.body.error as { issues?: string[] }).issues)).toBe(true);
    });

    it('returns 503 when no AI provider is configured', async () => {
      const res = await call(questionsHandler, 'POST', { config: makeConfig() });
      expect(res.statusCode).toBe(503);
      expect(res.body.error?.code).toBe('ai_not_configured');
    });

    it('generates and validates questions through the provider', async () => {
      process.env.LLM_API_KEY = 'sk-test';
      process.env.LLM_MODEL = 'test-model';
      resetEnvCache();
      const fetchMock = vi.fn().mockResolvedValue(openAiResponse(validQuestionsPayload(4)));
      vi.stubGlobal('fetch', fetchMock);

      const res = await call(questionsHandler, 'POST', { config: makeConfig({ questionCount: 4 }) });
      expect(res.statusCode).toBe(200);
      expect(res.body.source).toBe('ai');
      expect(res.body.model).toBe('test-model');
      expect((res.body.questions as unknown[]).length).toBe(4);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      expect(sent.messages[0].content).toMatch(/JSON object only/);
      expect(sent.messages[1].content).toContain('Software Engineer');
      expect(JSON.stringify(res.body)).not.toContain('sk-test');
    });

    it('deduplicates repeated model output and clamps difficulty', async () => {
      process.env.LLM_API_KEY = 'sk-test';
      resetEnvCache();
      const payload = validQuestionsPayload(4);
      payload.questions[1].text = payload.questions[0].text;
      payload.questions[2].difficulty = 'hard';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(openAiResponse(payload)));

      const res = await call(questionsHandler, 'POST', { config: makeConfig({ questionCount: 4, difficulty: 'easy' }) });
      expect(res.statusCode).toBe(200);
      const questions = res.body.questions as { id: string; difficulty: string }[];
      const ids = new Set(questions.map((q) => q.id));
      expect(ids.size).toBe(questions.length);
      for (const q of questions) expect(['easy', 'medium']).toContain(q.difficulty);
    });

    it('answers 502 when the model returns malformed JSON twice', async () => {
      process.env.LLM_API_KEY = 'sk-test';
      resetEnvCache();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(openAiResponse('this is not json')));
      const res = await call(questionsHandler, 'POST', { config: makeConfig() });
      expect(res.statusCode).toBe(502);
      expect(res.body.error?.code).toBe('upstream_error');
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });

    it('answers 502 when the model returns invalid question data', async () => {
      process.env.LLM_API_KEY = 'sk-test';
      resetEnvCache();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(openAiResponse({ questions: [{ text: 'hi' }] })));
      const res = await call(questionsHandler, 'POST', { config: makeConfig() });
      expect(res.statusCode).toBe(502);
    });

    it('answers 503 when the provider rejects credentials', async () => {
      process.env.LLM_API_KEY = 'sk-wrong';
      resetEnvCache();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized', json: async () => ({}) }),
      );
      const res = await call(questionsHandler, 'POST', { config: makeConfig() });
      expect(res.statusCode).toBe(503);
      expect(res.body.error?.code).toBe('ai_not_configured');
      expect(JSON.stringify(res.body)).not.toContain('sk-wrong');
    });

    it('answers 429 when the provider is rate limited', async () => {
      process.env.LLM_API_KEY = 'sk-test';
      resetEnvCache();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'slow down', json: async () => ({}) }),
      );
      const res = await call(questionsHandler, 'POST', { config: makeConfig() });
      expect(res.statusCode).toBe(429);
      expect(res.body.error?.code).toBe('rate_limited');
      expect(res.headers['retry-after']).toBeTruthy();
    });

    it('rate limits repeated calls per client', async () => {
      let last: Awaited<ReturnType<typeof call>> | null = null;
      for (let i = 0; i < 14; i += 1) {
        last = await call(questionsHandler, 'POST', { config: makeConfig() }, '10.9.9.9');
      }
      expect(last?.statusCode).toBe(429);
    });

    it('rejects non-POST methods', async () => {
      const res = await call(questionsHandler, 'GET');
      expect(res.statusCode).toBe(405);
    });
  });

  describe('POST /api/evaluate', () => {
    const question = makeQuestions(1)[0];
    const allowedIds = rubricForQuestion(question)
      .slice(0, 3)
      .map((d) => d.id);
    while (allowedIds.length < 3) allowedIds.push('relevance' as (typeof allowedIds)[number]);

    const payloadFor = (overrides: Partial<typeof validEvaluationPayload> = {}) => ({
      ...validEvaluationPayload,
      ...overrides,
      dimensions:
        overrides.dimensions ??
        validEvaluationPayload.dimensions.map((d, i) => ({ ...d, id: allowedIds[i] ?? allowedIds[0] })),
    });

    const body = (answer = LONG_ANSWER, includeFollowUp = false) => ({
      question: {
        id: question.id,
        text: question.text,
        category: question.category,
        difficulty: question.difficulty,
        skill: question.skill,
        criteria: question.criteria,
        answerStructure: question.answerStructure,
      },
      answer,
      config: { role: 'Software Engineer', experience: 'mid', industry: 'Fintech' },
      includeFollowUp,
    });

    it('rejects an empty answer', async () => {
      const res = await call(evaluateHandler, 'POST', body('   '));
      expect(res.statusCode).toBe(400);
      expect(res.body.error?.code).toBe('invalid_request');
    });

    it('rejects oversized answers with 413', async () => {
      const res = await call(evaluateHandler, 'POST', body('x'.repeat(9000)));
      expect(res.statusCode).toBe(413);
      expect(res.body.error?.code).toBe('answer_too_long');
    });

    it('returns 503 without a configured provider', async () => {
      const res = await call(evaluateHandler, 'POST', body());
      expect(res.statusCode).toBe(503);
      expect(res.body.error?.code).toBe('ai_not_configured');
    });

    it('returns a validated AI evaluation with follow-up', async () => {
      process.env.LLM_API_KEY = 'sk-test';
      resetEnvCache();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(openAiResponse(payloadFor())));

      const res = await call(evaluateHandler, 'POST', body(LONG_ANSWER, true));
      expect(res.statusCode).toBe(200);
      expect(res.body.overall).toBe(71);
      expect(res.body.followUpSource).toBe('ai');
      expect((res.body.dimensions as unknown[]).length).toBe(3);
      expect(res.body.model).toBe('test-model');
    });

    it('omits the follow-up when the client did not ask for one', async () => {
      process.env.LLM_API_KEY = 'sk-test';
      resetEnvCache();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(openAiResponse(payloadFor())));
      const res = await call(evaluateHandler, 'POST', body(LONG_ANSWER, false));
      expect(res.statusCode).toBe(200);
      expect(res.body.followUp).toBeNull();
    });

    it('rejects model output that does not cover the rubric', async () => {
      process.env.LLM_API_KEY = 'sk-test';
      resetEnvCache();
      const rubricIds = rubricForQuestion(question).map((d) => d.id);
      const outside = (
        ['relevance', 'completeness', 'clarity', 'structure', 'specificity', 'technical', 'evidence', 'communication'] as const
      ).find((id) => !rubricIds.includes(id));
      expect(outside).toBeTruthy();
      const bad = payloadFor({
        dimensions: Array.from({ length: 3 }, () => ({
          id: outside as 'clarity',
          score: 50,
          evidence: 'Evidence text that is long enough to satisfy the schema validator.',
        })),
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(openAiResponse(bad)));
      const res = await call(evaluateHandler, 'POST', body());
      expect(res.statusCode).toBe(502);
      expect(res.body.error?.code).toBe('upstream_error');
    });

    it('rejects duplicate dimension ids from the model', async () => {
      process.env.LLM_API_KEY = 'sk-test';
      resetEnvCache();
      const bad = payloadFor({
        dimensions: Array.from({ length: 3 }, () => ({
          id: allowedIds[0],
          score: 50,
          evidence: 'Evidence text that is long enough to satisfy the schema validator.',
        })),
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(openAiResponse(bad)));
      const res = await call(evaluateHandler, 'POST', body());
      expect(res.statusCode).toBe(502);
    });

    it('answers 502 when the model output fails schema validation', async () => {
      process.env.LLM_API_KEY = 'sk-test';
      resetEnvCache();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(openAiResponse({ overall: 'lots', dimensions: [] })));
      const res = await call(evaluateHandler, 'POST', body());
      expect(res.statusCode).toBe(502);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });
  });

  describe('POST /api/transcribe', () => {
    it('returns 503 when no transcription provider is configured', async () => {
      const res = await call(transcribeHandler, 'POST', {
        audio: 'AAAA'.repeat(10),
        mimeType: 'audio/webm',
      });
      expect(res.statusCode).toBe(503);
      expect(res.body.error?.code).toBe('speech_not_configured');
    });

    it('rejects unsupported audio types', async () => {
      process.env.SPEECH_API_KEY = 'dg-test';
      resetEnvCache();
      const res = await call(transcribeHandler, 'POST', {
        audio: 'AAAA'.repeat(10),
        mimeType: 'application/pdf',
      });
      expect(res.statusCode).toBe(415);
      expect(res.body.error?.code).toBe('unsupported_audio');
    });

    it('transcribes through the configured provider', async () => {
      process.env.SPEECH_API_KEY = 'dg-test';
      resetEnvCache();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ results: { channels: [{ alternatives: [{ transcript: 'hello there' }] }] } }),
          text: async () => '',
        }),
      );
      const res = await call(transcribeHandler, 'POST', {
        audio: 'AAAA'.repeat(10),
        mimeType: 'audio/webm',
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.text).toBe('hello there');
      expect(res.body.provider).toBe('deepgram');
      expect(JSON.stringify(res.body)).not.toContain('dg-test');
    });
  });
});
