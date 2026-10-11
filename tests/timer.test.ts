import { describe, expect, it } from 'vitest';
import {
  activeElapsedMs,
  answerDurationSeconds,
  formatClock,
  formatDuration,
  isExpired,
  remainingMs,
} from '../src/lib/timer';
import { makeSession } from './helpers';

describe('session timer', () => {
  it('returns zero before the session starts', () => {
    const session = makeSession();
    expect(activeElapsedMs(session, Date.now())).toBe(0);
    expect(isExpired(session)).toBe(false);
  });

  it('measures active time and excludes pauses', () => {
    const session = {
      ...makeSession(),
      startedAt: '2026-01-01T10:00:00.000Z',
      pausedAt: '2026-01-01T10:05:00.000Z',
      pausedMs: 60_000,
    };
    const now = Date.parse('2026-01-01T10:10:00.000Z');
    // 10 minutes wall clock - 5 minutes active pause - 1 minute earlier pause = 4 minutes
    expect(activeElapsedMs(session, now)).toBe(4 * 60_000);
    expect(remainingMs(session, now)).toBe(26 * 60_000);
  });

  it('stops the clock when the session is completed', () => {
    const session = {
      ...makeSession({}, { durationMinutes: 10 }),
      startedAt: '2026-01-01T10:00:00.000Z',
      completedAt: '2026-01-01T10:04:00.000Z',
      state: 'completed' as const,
    };
    const muchLater = Date.parse('2026-01-01T12:00:00.000Z');
    expect(activeElapsedMs(session, muchLater)).toBe(4 * 60_000);
    expect(isExpired(session, muchLater)).toBe(false);
  });

  it('marks a session expired once the budget is consumed', () => {
    const session = {
      ...makeSession({}, { durationMinutes: 10 }),
      startedAt: '2026-01-01T10:00:00.000Z',
      state: 'question' as const,
    };
    expect(isExpired(session, Date.parse('2026-01-01T10:09:00.000Z'))).toBe(false);
    expect(isExpired(session, Date.parse('2026-01-01T10:10:01.000Z'))).toBe(true);
    expect(remainingMs(session, Date.parse('2026-01-01T10:11:00.000Z'))).toBe(0);
  });

  it('formats clocks and durations', () => {
    expect(formatClock(65_000)).toBe('01:05');
    expect(formatClock(3_725_000)).toBe('1:02:05');
    expect(formatClock(-500)).toBe('00:00');
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(125)).toBe('2m 5s');
    expect(formatDuration(3_700)).toBe('1h 1m');
  });

  it('measures answer duration excluding pause overlap', () => {
    const seconds = answerDurationSeconds(
      '2026-01-01T10:00:00.000Z',
      Date.parse('2026-01-01T10:03:00.000Z'),
      undefined,
      0,
    );
    expect(seconds).toBe(180);
    const withPause = answerDurationSeconds(
      '2026-01-01T10:00:00.000Z',
      Date.parse('2026-01-01T10:03:00.000Z'),
      '2026-01-01T10:02:00.000Z',
      0,
    );
    expect(withPause).toBe(120);
    expect(answerDurationSeconds(undefined, Date.now(), undefined, 0)).toBe(0);
  });
});
