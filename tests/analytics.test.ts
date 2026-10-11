import { describe, expect, it } from 'vitest';
import { summarizeHistory } from '../src/lib/analytics';
import { makeEvaluation, makeSession, runToCompletion, LONG_ANSWER } from './helpers';
import type { InterviewSession } from '../src/lib/types';

function completedWithScore(role: string, scores: number[], day: number): InterviewSession {
  let session = runToCompletion(makeSession({}, { questionCount: scores.length, role }));
  const answers = { ...session.answers };
  session.questions.forEach((q, i) => {
    answers[q.id] = {
      ...answers[q.id],
      text: LONG_ANSWER,
      submittedAt: answers[q.id]?.submittedAt ?? new Date().toISOString(),
      evaluation: makeEvaluation({
        questionId: q.id,
        overall: scores[i],
        dimensions: [
          { id: 'relevance', label: 'Relevance', score: scores[i], evidence: 'Evidence for relevance dimension here.' },
          { id: 'clarity', label: 'Clarity', score: Math.max(20, scores[i] - 10), evidence: 'Evidence for clarity dimension here.' },
        ],
      }),
    };
  });
  const stamp = `2026-01-${String(day).padStart(2, '0')}T12:00:00.000Z`;
  session = { ...session, answers, completedAt: stamp, updatedAt: stamp, state: 'completed' };
  return session;
}

describe('historical analytics', () => {
  it('returns empty-safe defaults with no history', () => {
    const summary = summarizeHistory([]);
    expect(summary.totalSessions).toBe(0);
    expect(summary.completedSessions).toBe(0);
    expect(summary.averageScore).toBeNull();
    expect(summary.trendAvailable).toBe(false);
    expect(summary.trendNote).toMatch(/at least 3/);
    expect(summary.skillBreakdown).toHaveLength(0);
    expect(summary.notes.join(' ')).toMatch(/No completed interviews/);
  });

  it('refuses to show a trend with fewer than three completed interviews', () => {
    const one = [completedWithScore('Software Engineer', [70], 1)];
    const summary = summarizeHistory(one);
    expect(summary.trend).toHaveLength(1);
    expect(summary.trendAvailable).toBe(false);
    expect(summary.trendNote).toMatch(/you have 1/);

    const two = [one[0], completedWithScore('Software Engineer', [75, 65], 2)];
    expect(summarizeHistory(two).trendAvailable).toBe(false);
  });

  it('produces a score trend once enough real history exists', () => {
    const sessions = [
      completedWithScore('Software Engineer', [55], 1),
      completedWithScore('Software Engineer', [65], 2),
      completedWithScore('Data Analyst', [80], 3),
    ];
    const summary = summarizeHistory(sessions);
    expect(summary.trendAvailable).toBe(true);
    expect(summary.trend.map((t) => t.overall)).toEqual([55, 65, 80]);
    expect(summary.averageScore).toBe(Math.round((55 + 65 + 80) / 3));
    expect(summary.trendNote).toBeNull();
  });

  it('aggregates dimension averages and frequent misses', () => {
    const sessions = [
      completedWithScore('Software Engineer', [30], 1),
      completedWithScore('Software Engineer', [35], 2),
      completedWithScore('Software Engineer', [40], 3),
    ];
    const summary = summarizeHistory(sessions);
    const relevance = summary.dimensionAverages.find((d) => d.id === 'relevance');
    expect(relevance?.score).toBe(35);
    expect(summary.frequentMisses.find((m) => m.label === 'Relevance')?.count).toBe(3);
    expect(summary.frequentMisses[0].of).toBe(3);
  });

  it('builds a skill breakdown with honest levels', () => {
    const sessions = [
      completedWithScore('Software Engineer', [90], 1),
      completedWithScore('Software Engineer', [90], 2),
      completedWithScore('Software Engineer', [90], 3),
    ];
    const summary = summarizeHistory(sessions);
    expect(summary.skillBreakdown.length).toBeGreaterThan(0);
    expect(summary.skillBreakdown[0].attempts).toBeGreaterThan(0);
    expect(summary.skillBreakdown[0].level).toBe('strong');
  });

  it('counts in-progress and abandoned sessions separately', () => {
    const done = completedWithScore('Software Engineer', [70, 70, 70], 1);
    const abandoned = { ...makeSession(), state: 'abandoned' as const };
    const summary = summarizeHistory([done, abandoned]);
    expect(summary.completedSessions).toBe(1);
    expect(summary.abandonedSessions).toBe(1);
    expect(summary.inProgressSessions).toBe(0);
  });

  it('never claims to measure personality or confidence', () => {
    const summary = summarizeHistory([]);
    expect(summary.notes.join(' ')).toMatch(/personality/);
    expect(summary.notes.join(' ')).not.toMatch(/honesty score|confidence level/);
  });

  it('recommends practice areas only from weak measured skills', () => {
    const sessions = [
      completedWithScore('Software Engineer', [30], 1),
      completedWithScore('Software Engineer', [35], 2),
      completedWithScore('Software Engineer', [40], 3),
    ];
    const summary = summarizeHistory(sessions);
    expect(summary.recommendedAreas.length).toBeGreaterThan(0);
  });
});
