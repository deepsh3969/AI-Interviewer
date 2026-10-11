import { describe, expect, it } from 'vitest';
import { allBankQuestions, buildFallbackQuestions, roleBucket, QUESTION_BANK, bucketLabel } from '../src/lib/questionBank';
import { interviewQuestionSchema } from '../src/lib/validation';
import { makeConfig } from './helpers';

describe('fallback question bank', () => {
  it('maps roles to sensible buckets', () => {
    expect(roleBucket('Senior Backend Engineer')).toBe('software');
    expect(roleBucket('Data Scientist')).toBe('data');
    expect(roleBucket('Product Manager')).toBe('product');
    expect(roleBucket('UX Designer')).toBe('design');
    expect(roleBucket('Marketing Manager')).toBe('marketing');
    expect(roleBucket('Customer Support Agent')).toBe('support');
    expect(roleBucket('Astronaut')).toBe('generic');
    expect(bucketLabel('generic')).toBe('General');
  });

  it('produces the requested number of questions', () => {
    for (const count of [3, 5, 8]) {
      const questions = buildFallbackQuestions(makeConfig({ questionCount: count }));
      expect(questions).toHaveLength(count);
    }
  });

  it('generates valid question records', () => {
    const questions = buildFallbackQuestions(makeConfig({ questionCount: 10, type: 'mixed' }));
    for (const q of questions) {
      const parsed = interviewQuestionSchema.safeParse(q);
      expect(parsed.success, JSON.stringify(parsed.success ? null : parsed.error?.issues)).toBe(true);
      expect(q.source).toBe('fallback');
      expect(q.criteria.length).toBeGreaterThanOrEqual(2);
      expect(q.answerStructure.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('is deterministic for identical configuration', () => {
    const a = buildFallbackQuestions(makeConfig({ questionCount: 6 }));
    const b = buildFallbackQuestions(makeConfig({ questionCount: 6 }));
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
  });

  it('never returns duplicate questions', () => {
    const questions = buildFallbackQuestions(makeConfig({ questionCount: 20, type: 'mixed', role: 'Software Engineer' }));
    const texts = questions.map((q) => q.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('skips previously used questions when excludeIds is supplied', () => {
    const first = buildFallbackQuestions(makeConfig({ questionCount: 5 }));
    const second = buildFallbackQuestions(makeConfig({ questionCount: 5 }), {
      excludeIds: first.map((q) => q.id),
    });
    const overlap = second.filter((q) => first.some((f) => f.id === q.id));
    expect(overlap).toHaveLength(0);
  });

  it('keeps difficulty close to the requested level', () => {
    const ranks = { easy: 0, medium: 1, hard: 2 } as const;
    const strict = buildFallbackQuestions(makeConfig({ questionCount: 3, difficulty: 'easy', type: 'technical' }));
    for (const q of strict) {
      expect(Math.abs(ranks[q.difficulty] - ranks.easy)).toBeLessThanOrEqual(1);
    }
    // For larger sets the bank prefers nearby difficulties even when it has to relax.
    const large = buildFallbackQuestions(makeConfig({ questionCount: 8, difficulty: 'easy', type: 'technical' }));
    const near = large.filter((q) => Math.abs(ranks[q.difficulty] - ranks.easy) <= 1).length;
    expect(near).toBeGreaterThanOrEqual(Math.ceil(large.length / 2));
  });

  it('matches the interview type when the bank allows it', () => {
    const behavioral = buildFallbackQuestions(makeConfig({ questionCount: 4, type: 'behavioral' }));
    const inType = behavioral.filter((q) => q.category === 'behavioral');
    expect(inType.length).toBeGreaterThanOrEqual(3);
  });

  it('prefers questions from the role bucket', () => {
    const software = buildFallbackQuestions(makeConfig({ questionCount: 8, role: 'Frontend Engineer', type: 'technical' }));
    const technical = software.filter((q) => ['technical', 'system-design', 'problem-solving'].includes(q.category));
    expect(technical.length).toBeGreaterThanOrEqual(5);
  });

  it('exposes a deduplicated starter bank for the library', () => {
    const all = allBankQuestions();
    expect(all.length).toBeGreaterThan(60);
    const ids = new Set(all.map((q) => q.id));
    expect(ids.size).toBe(all.length);
    for (const key of Object.keys(QUESTION_BANK)) {
      expect(QUESTION_BANK[key as keyof typeof QUESTION_BANK].length).toBeGreaterThan(3);
    }
  });
});
