import { describe, expect, it } from 'vitest';
import { heuristicEvaluate, extractSignals, HEURISTIC_DISCLAIMER } from '../src/lib/heuristicEval';
import { makeEvaluation, makeQuestions, LONG_ANSWER } from './helpers';

const shortAnswer = 'I would just fix it quickly and move on.';

describe('rule-based fallback evaluation', () => {
  const [question] = makeQuestions(1);

  it('produces a structured evaluation on the documented scale', () => {
    const result = heuristicEvaluate(question, LONG_ANSWER, new Date('2026-01-01T00:00:00Z'));
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(78);
    expect(result.engine).toBe('heuristic');
    expect(result.disclaimer).toBe(HEURISTIC_DISCLAIMER);
    expect(result.dimensions.length).toBeGreaterThanOrEqual(4);
    for (const d of result.dimensions) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
      expect(d.evidence.length).toBeGreaterThan(10);
    }
    expect(result.evaluatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('scores a detailed answer above a vague one', () => {
    const strong = heuristicEvaluate(question, LONG_ANSWER);
    const weak = heuristicEvaluate(question, shortAnswer);
    expect(strong.overall).toBeGreaterThan(weak.overall);
  });

  it('never hands out a top score for a thin answer', () => {
    const result = heuristicEvaluate(question, shortAnswer);
    expect(result.overall).toBeLessThan(50);
    expect(result.weaknesses.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('flags missing quantified results', () => {
    const noMetrics = heuristicEvaluate(
      question,
      'The situation was that our team was behind schedule. I took the task of reorganising the board, I implemented weekly check-ins and the result was that the team felt better organised overall.',
    );
    expect(noMetrics.missing.join(' ')).toMatch(/quantified|metric/i);
  });

  it('detects STAR-shaped answers for behavioral questions', () => {
    const behavioral = makeQuestions(1, { type: 'behavioral' })[0];
    const star =
      'Situation: our checkout service was failing for 5% of users. Task: I owned payments. Action: I added retries and a circuit breaker, then rolled it out behind a flag. Result: failures dropped to 0.2% within a week and support tickets fell by 40%.';
    const signals = extractSignals(behavioral, star);
    expect(signals.starTotal).toBeGreaterThanOrEqual(3);
    expect(signals.metricCount).toBeGreaterThan(0);
    const result = heuristicEvaluate(behavioral, star);
    const structure = result.dimensions.find((d) => d.id === 'structure');
    expect(structure?.score).toBeGreaterThanOrEqual(60);
  });

  it('keeps evidence text derived from measurable signals', () => {
    const result = heuristicEvaluate(question, LONG_ANSWER);
    const completeness = result.dimensions.find((d) => d.id === 'completeness');
    expect(completeness?.evidence).toMatch(/words/);
  });

  it('is deterministic for the same inputs', () => {
    const a = heuristicEvaluate(question, LONG_ANSWER, new Date('2026-02-02T00:00:00Z'));
    const b = heuristicEvaluate(question, LONG_ANSWER, new Date('2026-02-02T00:00:00Z'));
    expect(a.overall).toBe(b.overall);
    expect(a.dimensions.map((d) => d.score)).toEqual(b.dimensions.map((d) => d.score));
  });

  it('produces an illustrative outline from the question rubric', () => {
    const result = heuristicEvaluate(question, LONG_ANSWER);
    expect(result.modelAnswerOutline.length).toBeGreaterThanOrEqual(3);
    expect(result.modelAnswerOutline).toEqual(question.answerStructure);
  });

  it('never mutates the sample evaluation helper shape', () => {
    const sample = makeEvaluation();
    expect(sample.engine).toBe('heuristic');
  });
});
