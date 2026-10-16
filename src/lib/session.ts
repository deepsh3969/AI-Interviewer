import type { AnswerRecord, InterviewQuestion, InterviewSession, SessionState } from './types.js';
import { randomId } from './id.js';

/**
 * Interview session state machine.
 *
 * READY -> STARTED -> QUESTION -> ANSWERING -> SUBMITTED -> FEEDBACK
 *        -> NEXT_QUESTION -> COMPLETED
 *
 * Pausing is modelled as a flag (pausedAt) so the core states stay legible.
 * ABANDONED is reserved for expired or force-ended sessions.
 */
export type SessionEvent =
  | { type: 'START' }
  | { type: 'SHOW_QUESTION' }
  | { type: 'BEGIN_ANSWER' }
  | { type: 'SUBMIT'; text?: string; skipped?: boolean }
  | { type: 'SHOW_FEEDBACK' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'COMPLETE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'ABANDON' };

export type SessionTransition =
  | { ok: true; session: InterviewSession }
  | { ok: false; session: InterviewSession; error: string };

const TERMINAL: SessionState[] = ['completed', 'abandoned'];

const ACTIVE: SessionState[] = ['started', 'question', 'answering', 'submitted', 'feedback', 'next-question'];

export function isActive(session: InterviewSession): boolean {
  return ACTIVE.includes(session.state) && !session.completedAt;
}

export function createSession(config: InterviewSession['config'], questions: InterviewQuestion[], generatedByAi: boolean): InterviewSession {
  const now = new Date().toISOString();
  return {
    id: randomId('sess'),
    createdAt: now,
    updatedAt: now,
    config,
    state: 'ready',
    questionIndex: 0,
    questions,
    answers: {},
    pausedMs: 0,
    generatedByAi,
  };
}

function touch(session: InterviewSession, patch: Partial<InterviewSession>): InterviewSession {
  return { ...session, ...patch, updatedAt: new Date().toISOString() };
}

function currentQuestion(session: InterviewSession): InterviewQuestion | undefined {
  return session.questions[session.questionIndex];
}

function fail(session: InterviewSession, error: string): SessionTransition {
  return { ok: false, session, error };
}

export function transition(session: InterviewSession, event: SessionEvent, now = new Date()): SessionTransition {
  if (TERMINAL.includes(session.state) && event.type !== 'PAUSE' && event.type !== 'RESUME') {
    return fail(session, 'This interview has already ended.');
  }

  switch (event.type) {
    case 'START': {
      if (session.state !== 'ready') return fail(session, 'Interview already started.');
      if (session.questions.length === 0) return fail(session, 'No questions available for this interview.');
      return {
        ok: true,
        session: touch(session, { state: 'started', startedAt: now.toISOString(), pausedAt: undefined, pausedMs: 0 }),
      };
    }

    case 'SHOW_QUESTION': {
      if (session.state !== 'started' && session.state !== 'next-question') {
        return fail(session, 'Cannot show a question in the current state.');
      }
      return { ok: true, session: touch(session, { state: 'question', answerStartedAt: undefined }) };
    }

    case 'BEGIN_ANSWER': {
      if (session.state !== 'question') return fail(session, 'Answers can only start from an active question.');
      if (session.pausedAt) return fail(session, 'Resume the interview before answering.');
      return { ok: true, session: touch(session, { state: 'answering', answerStartedAt: now.toISOString() }) };
    }

    case 'SUBMIT': {
      if (session.state !== 'answering') return fail(session, 'This answer was already submitted.');
      const question = currentQuestion(session);
      if (!question) return fail(session, 'No active question.');
      const skipped = event.skipped === true;
      const text = (event.text ?? '').trim();
      if (!skipped && text.length < 10) {
        return fail(session, 'Answer is too short. Write at least a sentence, or skip the question.');
      }
      const existing = session.answers[question.id];
      if (existing?.submittedAt) return fail(session, 'This answer was already submitted.');
      const record: AnswerRecord = {
        questionId: question.id,
        text: skipped ? '' : text,
        draft: skipped ? (existing?.draft ?? '') : text,
        submittedAt: now.toISOString(),
        durationSeconds: existing?.durationSeconds ?? 0,
        skipped,
        evaluation: existing?.evaluation,
        evaluationEngine: existing?.evaluationEngine,
      };
      return { ok: true, session: touch(session, { state: 'submitted', answers: { ...session.answers, [question.id]: record } }) };
    }

    case 'SHOW_FEEDBACK': {
      if (session.state !== 'submitted') return fail(session, 'Feedback is only available after submitting an answer.');
      return { ok: true, session: touch(session, { state: 'feedback' }) };
    }

    case 'NEXT_QUESTION': {
      if (session.state !== 'feedback') return fail(session, 'Finish reviewing feedback before moving on.');
      return { ok: true, session: touch(session, { state: 'next-question' }) };
    }

    case 'COMPLETE': {
      if (session.state !== 'next-question' && session.state !== 'question' && session.state !== 'answering' && session.state !== 'feedback' && session.state !== 'submitted') {
        return fail(session, 'Interview cannot be completed from the current state.');
      }
      return { ok: true, session: touch(session, { state: 'completed', completedAt: now.toISOString(), answerStartedAt: undefined }) };
    }

    case 'PAUSE': {
      if (TERMINAL.includes(session.state)) return fail(session, 'Interview already ended.');
      if (session.pausedAt) return fail(session, 'Interview is already paused.');
      if (!session.startedAt) return fail(session, 'Interview has not started.');
      return { ok: true, session: touch(session, { pausedAt: now.toISOString() }) };
    }

    case 'RESUME': {
      if (!session.pausedAt) return fail(session, 'Interview is not paused.');
      const paused = Math.max(0, now.getTime() - Date.parse(session.pausedAt));
      return { ok: true, session: touch(session, { pausedAt: undefined, pausedMs: session.pausedMs + paused }) };
    }

    case 'ABANDON': {
      if (TERMINAL.includes(session.state)) return fail(session, 'Interview already ended.');
      return { ok: true, session: touch(session, { state: 'abandoned', completedAt: now.toISOString(), answerStartedAt: undefined }) };
    }

    default: {
      const exhaustive: never = event;
      return fail(session, `Unknown event: ${JSON.stringify(exhaustive)}`);
    }
  }
}

/** Move to the next question when one exists, otherwise complete the interview. */
export function advance(session: InterviewSession, now = new Date()): SessionTransition {
  const hasNext = session.questionIndex + 1 < session.questions.length;
  if (!hasNext) return transition(session, { type: 'COMPLETE' }, now);
  const moved = transition(session, { type: 'SHOW_QUESTION' }, now);
  if (!moved.ok) return moved;
  return { ok: true, session: touch(moved.session, { questionIndex: session.questionIndex + 1, answerStartedAt: undefined }) };
}

/** Restore a session that was left in a transient state after a refresh. */
export function recoverSession(session: InterviewSession, now = new Date()): InterviewSession {
  if (TERMINAL.includes(session.state)) return session;
  if (session.state === 'submitted' || session.state === 'feedback' || session.state === 'next-question') {
    return session;
  }
  if (session.state === 'answering') {
    // Re-enter answering but drop a stale per-question stopwatch that predates a reload.
    return touch(session, { answerStartedAt: session.answerStartedAt ?? now.toISOString() });
  }
  return session;
}

export function canSkip(session: InterviewSession): boolean {
  return session.state === 'question' || session.state === 'answering';
}

export function answeredCount(session: InterviewSession): number {
  return session.questions.filter((q) => session.answers[q.id]?.submittedAt && !session.answers[q.id]?.skipped).length;
}

export function skippedCount(session: InterviewSession): number {
  return session.questions.filter((q) => session.answers[q.id]?.skipped).length;
}
