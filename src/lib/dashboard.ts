import type { InterviewSession } from './types.js';
import { activeElapsedMs } from './timer.js';

/**
 * Dashboard metrics.
 *
 * Every number here is derived from real session records - nothing is
 * estimated, padded or invented. Callers must handle nulls as "no data".
 */

export interface ScoreDelta {
  /** Average score of scored sessions completed in the last 30 days. */
  current: number;
  /** Average score of scored sessions completed in the 30 days before that. */
  previous: number;
  /** current - previous (rounded). */
  delta: number;
}

export interface KpiSummary {
  completed: number;
  averageScore: number | null;
  practiceSeconds: number;
  /** Consecutive local days with session activity, ending today or yesterday. 0 = broken/none. */
  streakDays: number;
  totalSessions: number;
  inProgress: number;
  /** Only present when both windows have at least 2 scored sessions. */
  scoreDelta: ScoreDelta | null;
}

function localDay(timestamp: Date | number | string): string {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayIndex(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function sessionDaySet(sessions: InterviewSession[]): Set<string> {
  const days = new Set<string>();
  for (const s of sessions) {
    if (!s.startedAt && !s.completedAt) {
      days.add(localDay(s.updatedAt));
      continue;
    }
    if (s.startedAt) days.add(localDay(s.startedAt));
    if (s.completedAt) days.add(localDay(s.completedAt));
    days.add(localDay(s.updatedAt));
  }
  return days;
}

/** Consecutive days with activity, counting back from today (or yesterday if today is empty). */
export function computeStreak(sessions: InterviewSession[], now = new Date()): number {
  const days = sessionDaySet(sessions);
  if (days.size === 0) return 0;

  const indices = new Set<number>();
  for (const day of days) indices.add(dayIndex(day));

  const today = dayIndex(localDay(now));
  let cursor = indices.has(today) ? today : today - 1;
  if (!indices.has(cursor)) return 0; // broken streak (last activity was 2+ days ago)

  let streak = 0;
  while (indices.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}

function scoredCompleted(sessions: InterviewSession[]): { at: number; score: number }[] {
  const out: { at: number; score: number }[] = [];
  for (const s of sessions) {
    if (s.state !== 'completed') continue;
    const scores = s.questions
      .map((q) => s.answers[q.id]?.evaluation?.overall)
      .filter((v): v is number => typeof v === 'number');
    if (scores.length === 0) continue;
    out.push({
      at: Date.parse(s.completedAt ?? s.updatedAt),
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    });
  }
  return out.sort((a, b) => a.at - b.at);
}

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_FOR_DELTA = 2;

/** 30-day vs previous-30-day average score comparison, only when both windows are meaningful. */
export function scoreDelta(sessions: InterviewSession[], now = new Date()): ScoreDelta | null {
  const scored = scoredCompleted(sessions).filter((x) => x.at <= now.getTime());
  const recent = scored.filter((x) => x.at > now.getTime() - WINDOW_MS);
  const prior = scored.filter((x) => x.at <= now.getTime() - WINDOW_MS && x.at > now.getTime() - 2 * WINDOW_MS);
  if (recent.length < MIN_FOR_DELTA || prior.length < MIN_FOR_DELTA) return null;
  const avg = (list: { score: number }[]) => Math.round(list.reduce((a, b) => a + b.score, 0) / list.length);
  const current = avg(recent);
  const previous = avg(prior);
  return { current, previous, delta: current - previous };
}

export function dashboardKpis(sessions: InterviewSession[], now = new Date()): KpiSummary {
  const completed = sessions.filter((s) => s.state === 'completed');
  const inProgress = sessions.filter((s) => !['completed', 'abandoned'].includes(s.state));

  const practiceSeconds = Math.round(
    sessions.reduce((sum, s) => {
      if (!s.startedAt) return sum;
      const end = s.completedAt
        ? Date.parse(s.completedAt)
        : s.state === 'abandoned'
          ? Date.parse(s.updatedAt)
          : now.getTime();
      return sum + activeElapsedMs(s, end);
    }, 0) / 1000,
  );

  const scored = completed
    .map((s) => s.questions.map((q) => s.answers[q.id]?.evaluation?.overall).filter((v): v is number => typeof v === 'number'))
    .filter((list) => list.length > 0)
    .map((list) => list.reduce((a, b) => a + b, 0) / list.length);
  const averageScore = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;

  return {
    completed: completed.length,
    averageScore,
    practiceSeconds,
    streakDays: computeStreak(sessions, now),
    totalSessions: sessions.length,
    inProgress: inProgress.length,
    scoreDelta: scoreDelta(sessions, now),
  };
}

export interface RecentRow {
  id: string;
  role: string;
  type: string;
  difficulty: string;
  date: string;
  status: 'completed' | 'in-progress' | 'ended-early';
  score: number | null;
  durationSeconds: number;
  answeredCount: number;
  questionCount: number;
}

export function recentInterviewRows(
  sessions: InterviewSession[],
  now = new Date(),
  limit = 6,
): RecentRow[] {
  return [...sessions]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
    .map((s) => {
      const answered = s.questions.filter((q) => s.answers[q.id]?.submittedAt).length;
      const scores = s.questions
        .map((q) => s.answers[q.id]?.evaluation?.overall)
        .filter((v): v is number => typeof v === 'number');
      const end = s.completedAt
        ? Date.parse(s.completedAt)
        : s.state === 'abandoned'
          ? Date.parse(s.updatedAt)
          : now.getTime();
      return {
        id: s.id,
        role: s.config.role,
        type: s.config.type,
        difficulty: s.config.difficulty,
        date: (s.completedAt ?? s.updatedAt).slice(0, 10),
        status:
          s.state === 'completed' ? 'completed' : s.state === 'abandoned' ? 'ended-early' : 'in-progress',
        score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        durationSeconds: s.startedAt ? Math.round(activeElapsedMs(s, end) / 1000) : 0,
        answeredCount: answered,
        questionCount: s.questions.length,
      };
    });
}

/** Rough answer-time estimate for a plan (labelled as an estimate in the UI). */
export function estimateMinutes(questionCount: number, difficulty: 'easy' | 'medium' | 'hard'): number {
  const perQuestion = difficulty === 'easy' ? 120 : difficulty === 'hard' ? 260 : 180;
  return Math.max(5, Math.round((questionCount * perQuestion) / 60));
}
