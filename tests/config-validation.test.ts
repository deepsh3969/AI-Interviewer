import { describe, expect, it } from 'vitest';
import { validateConfig, interviewConfigSchema, evaluationSchema, interviewQuestionSchema } from '../src/lib/validation';
import { makeConfig } from './helpers';

describe('interview configuration validation', () => {
  it('accepts a valid configuration', () => {
    const result = validateConfig(makeConfig());
    expect(result.ok).toBe(true);
  });

  it('rejects an empty role', () => {
    const result = validateConfig(makeConfig({ role: '  ' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join(' ')).toMatch(/role/i);
  });

  it('rejects out-of-range question counts', () => {
    expect(validateConfig(makeConfig({ questionCount: 2 })).ok).toBe(false);
    expect(validateConfig(makeConfig({ questionCount: 25 })).ok).toBe(false);
  });

  it('rejects unknown enums', () => {
    expect(validateConfig({ ...makeConfig(), type: 'telepathy' }).ok).toBe(false);
    expect(validateConfig({ ...makeConfig(), experience: 'guru' }).ok).toBe(false);
  });

  it('rejects oversized resume / job description text', () => {
    expect(validateConfig(makeConfig({ resumeText: 'x'.repeat(8001) })).ok).toBe(false);
    expect(validateConfig(makeConfig({ jobDescription: 'y'.repeat(8001) })).ok).toBe(false);
  });

  it('warns when a large question count has too little time', () => {
    const result = validateConfig(makeConfig({ questionCount: 15, durationMinutes: 10 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join(' ')).toMatch(/at least 15 minutes/);
  });

  it('rejects a job description that is too short to be useful', () => {
    const result = validateConfig(makeConfig({ jobDescription: 'Write code' }));
    expect(result.ok).toBe(false);
  });

  it('defaults optional text fields', () => {
    const parsed = interviewConfigSchema.safeParse({
      role: 'Data Analyst',
      experience: 'entry',
      type: 'hr',
      difficulty: 'easy',
      questionCount: 3,
      durationMinutes: 15,
      mode: 'typed',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.jobDescription).toBe('');
      expect(parsed.data.followUps).toBe(true);
    }
  });
});

describe('AI output schema validation', () => {
  const goodQuestion = {
    id: 'ai_1',
    text: 'Tell me about a time you improved a process.',
    category: 'behavioral',
    difficulty: 'medium',
    skill: 'Ownership',
    criteria: [{ id: 'crit_1', label: 'STAR structure', weight: 3 }],
    answerStructure: ['Situation', 'Action', 'Result'],
    source: 'ai',
    timeLimitSeconds: 180,
  };

  it('accepts a well-formed question', () => {
    expect(interviewQuestionSchema.safeParse(goodQuestion).success).toBe(true);
  });

  it('rejects a question with an unknown category', () => {
    expect(interviewQuestionSchema.safeParse({ ...goodQuestion, category: 'vibes' }).success).toBe(false);
  });

  it('rejects an evaluation with duplicate dimensions', () => {
    const payload = {
      overall: 70,
      dimensions: [
        { id: 'relevance', score: 70, evidence: 'Answer addresses the question about caching.' },
        { id: 'relevance', score: 70, evidence: 'Answer addresses the question about caching.' },
        { id: 'clarity', score: 70, evidence: 'Sentences are short and readable.' },
      ],
      strengths: [],
      weaknesses: [],
      missing: [],
      suggestions: [],
      modelAnswerOutline: ['Context', 'Result'],
    };
    expect(evaluationSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects an evaluation with vague dimension evidence', () => {
    const payload = {
      overall: 70,
      dimensions: [
        { id: 'relevance', score: 70, evidence: 'ok' },
        { id: 'clarity', score: 70, evidence: 'Sentences are short and readable enough.' },
        { id: 'structure', score: 70, evidence: 'Sequencing words such as first and then appear.' },
      ],
      strengths: [],
      weaknesses: [],
      missing: [],
      suggestions: [],
      modelAnswerOutline: ['Context', 'Result'],
    };
    expect(evaluationSchema.safeParse(payload).success).toBe(false);
  });

  it('requires weaknesses when the score is low', () => {
    const payload = {
      overall: 35,
      dimensions: [
        { id: 'relevance', score: 40, evidence: 'Only partly addresses the asked topic.' },
        { id: 'clarity', score: 35, evidence: 'Very long sentences with many filler words.' },
        { id: 'structure', score: 30, evidence: 'No sequencing or logical order visible.' },
      ],
      strengths: [],
      weaknesses: [],
      missing: [],
      suggestions: [],
      modelAnswerOutline: ['Context', 'Result'],
    };
    expect(evaluationSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects out-of-range scores', () => {
    const payload = {
      overall: 140,
      dimensions: [
        { id: 'relevance', score: 70, evidence: 'Addresses the question as asked here.' },
        { id: 'clarity', score: 70, evidence: 'Sentences are short and readable here.' },
        { id: 'structure', score: 70, evidence: 'Sequencing words such as first appear here.' },
      ],
      strengths: [],
      weaknesses: [],
      missing: [],
      suggestions: [],
      modelAnswerOutline: ['Context', 'Result'],
    };
    expect(evaluationSchema.safeParse(payload).success).toBe(false);
  });
});
