import type { InterviewSession } from './types.js';

/** Elapsed active session time in ms, excluding paused periods. */
export function activeElapsedMs(session: InterviewSession, now: number = Date.now()): number {
  if (!session.startedAt) return 0;
  const start = Date.parse(session.startedAt);
  const end = session.completedAt ? Date.parse(session.completedAt) : now;
  const pausedNow = session.pausedAt ? Math.max(0, now - Date.parse(session.pausedAt)) : 0;
  return Math.max(0, end - start - session.pausedMs - pausedNow);
}

export function activeElapsedSeconds(session: InterviewSession, now: number = Date.now()): number {
  return Math.floor(activeElapsedMs(session, now) / 1000);
}

/** Session budget in ms based on configured duration. */
export function sessionBudgetMs(session: InterviewSession): number {
  return session.config.durationMinutes * 60_000;
}

export function remainingMs(session: InterviewSession, now: number = Date.now()): number {
  return Math.max(0, sessionBudgetMs(session) - activeElapsedMs(session, now));
}

export function isExpired(session: InterviewSession, now: number = Date.now()): boolean {
  if (session.state === 'completed' || session.state === 'abandoned') return false;
  return remainingMs(session, now) <= 0;
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Seconds spent on a single answer, excluding overlap with paused time. */
export function answerDurationSeconds(
  startedAt: string | undefined,
  now: number,
  pausedAt: string | undefined,
  pausedMs: number,
): number {
  if (!startedAt) return 0;
  const start = Date.parse(startedAt);
  const pausedNow = pausedAt ? Math.max(0, now - Date.parse(pausedAt)) : 0;
  return Math.max(0, Math.floor((now - start - pausedMs - pausedNow) / 1000));
}
