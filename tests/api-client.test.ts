import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, evaluateAnswer, fetchStatus, generateQuestionSet, heuristicFollowUp } from '../src/lib/apiClient';
import { makeConfig, makeQuestions, LONG_ANSWER } from './helpers';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('API client fallbacks', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses AI questions when the server provides them', async () => {
    const questions = makeQuestions(3).map((q) => ({ ...q, source: 'ai' }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { questions, source: 'ai', model: 'm1' })));
    const result = await generateQuestionSet(makeConfig({ questionCount: 3 }));
    expect(result.source).toBe('ai');
    expect(result.model).toBe('m1');
    expect(result.questions).toHaveLength(3);
  });

  it('falls back to the deterministic bank when AI is not configured', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(503, { error: { code: 'ai_not_configured', message: 'nope' } })),
    );
    const result = await generateQuestionSet(makeConfig({ questionCount: 4 }));
    expect(result.source).toBe('fallback');
    expect(result.note).toMatch(/fallback/i);
    expect(result.questions).toHaveLength(4);
    expect(result.questions.every((q) => q.source === 'fallback')).toBe(true);
  });

  it('falls back when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const result = await generateQuestionSet(makeConfig({ questionCount: 3 }));
    expect(result.source).toBe('fallback');
    expect(result.note).toMatch(/unreachable|connection/i);
  });

  it('surfaces invalid configuration instead of falling back silently', async () => {
    await expect(generateQuestionSet(makeConfig({ questionCount: 1 }))).rejects.toBeInstanceOf(ApiError);
  });

  it('evaluates with AI when available', async () => {
    const question = makeQuestions(1)[0];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(200, {
          overall: 84,
          dimensions: [
            { id: 'relevance', score: 85, evidence: 'Directly answers the asked question about caching here.' },
            { id: 'clarity', score: 80, evidence: 'Short readable sentences throughout the answer here.' },
            { id: 'structure', score: 86, evidence: 'Clear beginning middle and end structure here.' },
          ],
          strengths: ['Good'],
          weaknesses: [],
          missing: [],
          suggestions: [],
          modelAnswerOutline: ['A', 'B'],
          followUp: 'What trade-off did you accept?',
          followUpSource: 'ai',
          model: 'm1',
        }),
      ),
    );
    const result = await evaluateAnswer({
      question,
      answer: LONG_ANSWER,
      config: { role: 'Software Engineer', experience: 'mid', industry: '' },
      includeFollowUp: true,
    });
    expect(result.source).toBe('ai');
    expect(result.evaluation.engine).toBe('ai');
    expect(result.evaluation.overall).toBe(84);
    expect(result.followUpSource).toBe('ai');
    expect(result.evaluation.disclaimer).toMatch(/practice feedback/i);
  });

  it('falls back to the labelled heuristic when evaluation is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(503, { error: { code: 'ai_not_configured', message: 'nope' } })),
    );
    const question = makeQuestions(1)[0];
    const result = await evaluateAnswer({
      question,
      answer: LONG_ANSWER,
      config: { role: 'Software Engineer', experience: 'mid', industry: '' },
      includeFollowUp: true,
    });
    expect(result.source).toBe('heuristic');
    expect(result.evaluation.engine).toBe('heuristic');
    expect(result.note).toMatch(/heuristic/i);
    expect(result.followUpSource).toBe('heuristic');
    expect(result.followUp).toBeTruthy();
  });

  it('ignores a follow-up when the client disabled them', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(503, { error: { code: 'ai_not_configured', message: 'nope' } })),
    );
    const result = await evaluateAnswer({
      question: makeQuestions(1)[0],
      answer: LONG_ANSWER,
      config: { role: 'Software Engineer', experience: 'mid', industry: '' },
      includeFollowUp: false,
    });
    expect(result.followUp).toBeNull();
    expect(result.followUpSource).toBeNull();
  });

  it('falls back when the server returns an invalid evaluation payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { overall: 'high', dimensions: [] })));
    const result = await evaluateAnswer({
      question: makeQuestions(1)[0],
      answer: LONG_ANSWER,
      config: { role: 'Software Engineer', experience: 'mid', industry: '' },
      includeFollowUp: false,
    });
    expect(result.source).toBe('heuristic');
    expect(result.evaluation.overall).toBeLessThanOrEqual(78);
  });

  it('reports unreachable status endpoints as null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchStatus()).toBeNull();
  });

  it('probes the answer for a real follow-up question', () => {
    const question = makeQuestions(1)[0];
    expect(heuristicFollowUp(question, 'I did the thing and it worked out well for everyone involved here.')).toMatch(
      /\?$/,
    );
    expect(heuristicFollowUp(question, '')).toBeNull();
  });
});
