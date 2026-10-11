import { describe, expect, it } from 'vitest';
import { advance, answeredCount, createSession, recoverSession, skippedCount, transition } from '../src/lib/session';
import { LONG_ANSWER, advanceTo, makeQuestions, makeSession, runToCompletion } from './helpers';

describe('interview session state machine', () => {
  it('walks READY -> STARTED -> QUESTION -> ANSWERING -> SUBMITTED -> FEEDBACK -> NEXT_QUESTION -> COMPLETED', () => {
    let session = makeSession();
    expect(session.state).toBe('ready');

    const start = transition(session, { type: 'START' });
    expect(start.ok).toBe(true);
    session = start.session;
    expect(session.state).toBe('started');
    expect(session.startedAt).toBeTruthy();

    const show = transition(session, { type: 'SHOW_QUESTION' });
    expect(show.ok && show.session.state).toBe('question');

    const begin = transition(show.session, { type: 'BEGIN_ANSWER' });
    expect(begin.ok && begin.session.state).toBe('answering');
    expect(begin.session.answerStartedAt).toBeTruthy();

    const submit = transition(begin.session, { type: 'SUBMIT', text: LONG_ANSWER });
    expect(submit.ok && submit.session.state).toBe('submitted');
    expect(submit.session.answers[session.questions[0].id].text).toBe(LONG_ANSWER);

    const feedback = transition(submit.session, { type: 'SHOW_FEEDBACK' });
    expect(feedback.ok && feedback.session.state).toBe('feedback');

    const next = transition(feedback.session, { type: 'NEXT_QUESTION' });
    expect(next.ok && next.session.state).toBe('next-question');

    const advanced = advance(next.session);
    expect(advanced.ok && advanced.session.state).toBe('question');
    expect(advanced.session.questionIndex).toBe(1);
  });

  it('rejects invalid transitions', () => {
    const session = makeSession();
    expect(transition(session, { type: 'SHOW_QUESTION' }).ok).toBe(false);
    expect(transition(session, { type: 'BEGIN_ANSWER' }).ok).toBe(false);
    expect(transition(session, { type: 'SUBMIT', text: LONG_ANSWER }).ok).toBe(false);
    const started = transition(session, { type: 'START' });
    expect(started.ok).toBe(true);
    if (started.ok) expect(transition(started.session, { type: 'START' }).ok).toBe(false);
  });

  it('prevents duplicate submissions for the same answer', () => {
    const session = advanceTo(makeSession(), 'submitted');
    const again = transition(session, { type: 'SUBMIT', text: LONG_ANSWER });
    expect(again.ok).toBe(false);
    expect(again.ok === false && again.error).toMatch(/already submitted/i);
  });

  it('refuses answers that are too short', () => {
    const session = advanceTo(makeSession(), 'answering');
    const result = transition(session, { type: 'SUBMIT', text: 'no' });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/too short/i);
  });

  it('records skipped questions without text', () => {
    const session = advanceTo(makeSession(), 'answering');
    const result = transition(session, { type: 'SUBMIT', skipped: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.state).toBe('submitted');
      expect(skippedCount(result.session)).toBe(1);
    }
  });

  it('cannot start with no questions', () => {
    const session = createSession(makeSession().config, [], false);
    const result = transition(session, { type: 'START' });
    expect(result.ok).toBe(false);
  });

  it('completes after the final question', () => {
    const session = runToCompletion(makeSession({}, { questionCount: 3 }));
    expect(session.state).toBe('completed');
    expect(session.completedAt).toBeTruthy();
    expect(answeredCount(session)).toBe(3);
    expect(session.questionIndex).toBe(2);
  });

  it('locks a completed session', () => {
    const session = advanceTo(makeSession(), 'submitted');
    const done = transition(session, { type: 'COMPLETE' });
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(transition(done.session, { type: 'START' }).ok).toBe(false);
      expect(transition(done.session, { type: 'ABANDON' }).ok).toBe(false);
    }
  });

  it('supports pause and resume while tracking paused time', () => {
    let session = advanceTo(makeSession(), 'question');
    const t0 = new Date('2026-01-01T10:00:00Z');
    const paused = transition(session, { type: 'PAUSE' }, t0);
    expect(paused.ok).toBe(true);
    if (!paused.ok) return;
    session = paused.session;
    expect(session.pausedAt).toBe(t0.toISOString());
    const resume = transition(session, { type: 'RESUME' }, new Date('2026-01-01T10:02:00Z'));
    expect(resume.ok).toBe(true);
    if (!resume.ok) return;
    expect(resume.session.pausedAt).toBeUndefined();
    expect(resume.session.pausedMs).toBe(120_000);
    expect(transition(resume.session, { type: 'RESUME' }).ok).toBe(false);
  });

  it('abandons an active session', () => {
    const session = advanceTo(makeSession(), 'question');
    const result = transition(session, { type: 'ABANDON' });
    expect(result.ok && result.session.state).toBe('abandoned');
  });

  it('keeps transient state across recoverSession', () => {
    const submitted = advanceTo(makeSession(), 'submitted');
    expect(recoverSession(submitted).state).toBe('submitted');
    const answering = advanceTo(makeSession(), 'answering');
    const recovered = recoverSession({ ...answering, answerStartedAt: undefined });
    expect(recovered.state).toBe('answering');
    expect(recovered.answerStartedAt).toBeTruthy();
  });

  it('counts answered questions', () => {
    const session = advanceTo(makeSession(), 'submitted');
    expect(answeredCount(session)).toBe(1);
    expect(makeSession({}, { questionCount: 3 }).questions).toHaveLength(3);
    expect(makeQuestions(5)).toHaveLength(5);
  });
});
