import { describe, expect, it } from 'vitest';
import {
  computeStreak,
  dashboardKpis,
  estimateMinutes,
  recentInterviewRows,
  scoreDelta,
  sessionDaySet,
} from '../src/lib/dashboard';
import { makeEvaluation, makeSession, runToCompletion, LONG_ANSWER } from './helpers';
import type { InterviewSession } from '../src/lib/types';

const NOW = new Date('2026-06-15T10:00:00.000Z');

function stampDaysAgo(days: number): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/** A completed session stamped `daysAgo` days before NOW with per-question scores. */
function scoredCompleted(daysAgo: number, scores: number[], role = 'Software Engineer'): InterviewSession {
  let session = runToCompletion(makeSession({}, { questionCount: scores.length, role }));
  const answers = { ...session.answers };
  session.questions.forEach((q, i) => {
    answers[q.id] = {
      ...answers[q.id],
      text: LONG_ANSWER,
      submittedAt: answers[q.id]?.submittedAt ?? stampDaysAgo(daysAgo),
      evaluation: makeEvaluation({ questionId: q.id, overall: scores[i] }),
    };
  });
  const stamp = stampDaysAgo(daysAgo);
  session = {
    ...session,
    answers,
    startedAt: new Date(Date.parse(stamp) - 600_000).toISOString(),
    completedAt: stamp,
    updatedAt: stamp,
    state: 'completed',
  };
  return session;
}

describe('dashboard metrics', () => {
  describe('sessionDaySet / computeStreak', () => {
    it('is empty-safe', () => {
      expect(sessionDaySet([]).size).toBe(0);
      expect(computeStreak([], NOW)).toBe(0);
    });

    it('stamps local activity days for a never-started session from updatedAt', () => {
      const session = makeSession();
      const days = sessionDaySet([session]);
      expect(days.size).toBe(1);
      expect([...days][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('counts consecutive active days ending today', () => {
      const sessions = [scoredCompleted(0, [70]), scoredCompleted(1, [70]), scoredCompleted(2, [70])];
      expect(computeStreak(sessions, NOW)).toBe(3);
    });

    it('ends a streak at a gap', () => {
      const sessions = [scoredCompleted(0, [70]), scoredCompleted(1, [70]), scoredCompleted(3, [70])];
      expect(computeStreak(sessions, NOW)).toBe(2);
    });

    it('is zero when the last activity was two or more days ago', () => {
      expect(computeStreak([scoredCompleted(2, [70])], NOW)).toBe(0);
    });

    it('is one when only today has activity', () => {
      expect(computeStreak([scoredCompleted(0, [70])], NOW)).toBe(1);
    });
  });

  describe('scoreDelta', () => {
    it('is null without enough scored sessions in both 30-day windows', () => {
      expect(scoreDelta([], NOW)).toBeNull();
      // Only one scored session in the current window.
      expect(scoreDelta([scoredCompleted(5, [80]), scoredCompleted(40, [60]), scoredCompleted(50, [70])], NOW)).toBeNull();
      // Current window has enough, prior window does not.
      expect(scoreDelta([scoredCompleted(1, [80]), scoredCompleted(2, [90])], NOW)).toBeNull();
    });

    it('compares real averages across the two windows', () => {
      const sessions = [
        scoredCompleted(3, [80]),
        scoredCompleted(10, [90]),
        scoredCompleted(35, [60]),
        scoredCompleted(50, [70]),
      ];
      const delta = scoreDelta(sessions, NOW);
      expect(delta).not.toBeNull();
      expect(delta?.current).toBe(85);
      expect(delta?.previous).toBe(65);
      expect(delta?.delta).toBe(20);
    });

    it('exposes a negative delta when scores regressed', () => {
      const sessions = [
        scoredCompleted(3, [50]),
        scoredCompleted(10, [55]),
        scoredCompleted(35, [80]),
        scoredCompleted(50, [90]),
      ];
      const delta = scoreDelta(sessions, NOW);
      expect(delta?.current).toBe(53);
      expect(delta?.previous).toBe(85);
      expect(delta?.delta).toBe(-32);
    });
  });

  describe('dashboardKpis', () => {
    it('returns zero-safe defaults with no history', () => {
      const kpis = dashboardKpis([], NOW);
      expect(kpis.completed).toBe(0);
      expect(kpis.totalSessions).toBe(0);
      expect(kpis.inProgress).toBe(0);
      expect(kpis.averageScore).toBeNull();
      expect(kpis.practiceSeconds).toBe(0);
      expect(kpis.streakDays).toBe(0);
      expect(kpis.scoreDelta).toBeNull();
    });

    it('derives every KPI from real sessions', () => {
      const completed = scoredCompleted(0, [70, 80]);
      const inProgress = makeSession({}, { role: 'Data Analyst' }); // state: ready
      const kpis = dashboardKpis([completed, inProgress], NOW);
      expect(kpis.completed).toBe(1);
      expect(kpis.totalSessions).toBe(2);
      expect(kpis.inProgress).toBe(1);
      expect(kpis.averageScore).toBe(75);
      expect(kpis.streakDays).toBe(1);
      expect(kpis.practiceSeconds).toBeGreaterThanOrEqual(0);
      expect(kpis.scoreDelta).toBeNull(); // never enough history to compare
    });
  });

  describe('recentInterviewRows', () => {
    it('sorts newest first and respects the limit', () => {
      const older = scoredCompleted(5, [60]);
      const newer = scoredCompleted(1, [70]);
      const rows = recentInterviewRows([older, newer], NOW, 1);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(newer.id);

      const all = recentInterviewRows([older, newer], NOW, 10);
      expect(all.map((r) => r.id)).toEqual([newer.id, older.id]);
    });

    it('maps status, score and progress honestly', () => {
      const completed = scoredCompleted(1, [65, 75]);
      const untouched = makeSession({ updatedAt: stampDaysAgo(2) });
      const rows = recentInterviewRows([completed, untouched], NOW, 10);
      const [a, b] = rows;

      expect(a.status).toBe('completed');
      expect(a.score).toBe(70);
      expect(a.answeredCount).toBe(a.questionCount);
      expect(a.date).toBe(stampDaysAgo(1).slice(0, 10));

      expect(b.status).toBe('in-progress');
      expect(b.score).toBeNull();
      expect(b.answeredCount).toBe(0);
      expect(b.durationSeconds).toBe(0);
    });
  });

  describe('estimateMinutes', () => {
    it('never goes below five minutes', () => {
      expect(estimateMinutes(1, 'easy')).toBe(5);
    });

    it('scales with question count and difficulty', () => {
      expect(estimateMinutes(5, 'medium')).toBe(15);
      expect(estimateMinutes(8, 'hard')).toBe(35);
      expect(estimateMinutes(3, 'easy')).toBe(6);
    });
  });
});
