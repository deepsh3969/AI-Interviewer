import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { transition, recoverSession, type SessionEvent } from '../lib/session';
import { activeElapsedMs, answerDurationSeconds, isExpired, remainingMs } from '../lib/timer';
import { clearDraft, getDraft, saveDraft, upsertSession } from '../lib/storage';
import { evaluateAnswer } from '../lib/apiClient';
import { hashString } from '../lib/id';
import type { Evaluation, InterviewQuestion, InterviewSession } from '../lib/types';
import { useStore } from '../state/store';
import { useToast } from '../state/toast';

export interface UseInterviewResult {
  session: InterviewSession | null;
  question: InterviewQuestion | null;
  draft: string;
  elapsedMs: number;
  remainingMs: number;
  questionElapsedSeconds: number;
  expired: boolean;
  busy: boolean;
  evaluating: boolean;
  evaluationError: string | null;
  followUpAdded: boolean;
  setDraft: (text: string) => void;
  send: (event: SessionEvent) => { ok: boolean; error?: string };
  start: () => void;
  beginAnswer: () => void;
  submitAnswer: (text: string) => Promise<void>;
  skipQuestion: () => Promise<void>;
  showFeedback: () => void;
  nextQuestion: () => void;
  pause: () => void;
  resume: () => void;
  endEarly: () => void;
  retryEvaluation: () => Promise<void>;
}

const FOLLOW_UP_STRUCTURE = [
  'Answer the probe directly in one sentence',
  'Give the specific detail, number or example that was asked for',
  'Connect it back to the original question',
];

export function buildFollowUpQuestion(parent: InterviewQuestion, text: string): InterviewQuestion {
  return {
    id: `fu_${hashString(`${parent.id}|${text}`)}`,
    text,
    category: parent.category,
    difficulty: parent.difficulty,
    skill: parent.skill,
    criteria: parent.criteria,
    answerStructure: FOLLOW_UP_STRUCTURE,
    source: parent.source === 'ai' ? 'ai' : 'fallback',
    timeLimitSeconds: Math.min(240, parent.timeLimitSeconds),
    followUpFor: parent.id,
  };
}

export function useInterview(sessionId: string | undefined): UseInterviewResult {
  const { db, update } = useStore();
  const { push } = useToast();
  const [, forceTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [followUpAdded, setFollowUpAdded] = useState(false);
  const recoveredRef = useRef(false);

  const session = useMemo(() => db.sessions.find((s) => s.id === sessionId) ?? null, [db.sessions, sessionId]);

  // Recover transient state after a refresh (does not erase any work).
  useEffect(() => {
    if (!session || recoveredRef.current) return;
    recoveredRef.current = true;
    const recovered = recoverSession(session);
    if (recovered !== session) {
      const result = update((database) => ({
        ...database,
        sessions: database.sessions.map((s) => (s.id === recovered.id ? recovered : s)),
      }));
      if (!result.ok) push(result.error, 'error');
    }
  }, [session, update, push]);

  // One-second clock while the session is active.
  const clockStarted = Boolean(session?.startedAt);
  const clockStopped = Boolean(session?.completedAt);
  useEffect(() => {
    if (!clockStarted || clockStopped) return;
    const timer = window.setInterval(() => forceTick((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, [clockStarted, clockStopped]);

  const persist = useCallback(
    (next: InterviewSession) => {
      const result = upsertSession(next);
      if (!result.ok) push(result.error, 'error');
      return result.ok;
    },
    [push],
  );

  const send = useCallback(
    (event: SessionEvent) => {
      if (!session) return { ok: false, error: 'Session not found.' };
      const outcome = transition(session, event);
      if (outcome.ok) {
        persist(outcome.session);
      }
      return { ok: outcome.ok, error: outcome.ok ? undefined : outcome.error };
    },
    [session, persist],
  );

  const question = session ? (session.questions[session.questionIndex] ?? null) : null;
  const draft = session && question ? getDraft(session.id, question.id) : '';

  const setDraft = useCallback(
    (text: string) => {
      if (!session || !question) return;
      const result = saveDraft(session.id, question.id, text);
      if (!result.ok) push(result.error, 'error');
      forceTick((n) => n + 1);
    },
    [session, question, push],
  );

  const runEvaluation = useCallback(
    async (target: InterviewSession, answerText: string): Promise<void> => {
      const activeQuestion = target.questions[target.questionIndex];
      if (!activeQuestion || !answerText.trim()) {
        setEvaluating(false);
        const shown = transition(target, { type: 'SHOW_FEEDBACK' });
        if (shown.ok) persist(shown.session);
        return;
      }
      setEvaluating(true);
      setEvaluationError(null);
      try {
        const result = await evaluateAnswer({
          question: activeQuestion,
          answer: answerText,
          config: {
            role: target.config.role,
            experience: target.config.experience,
            industry: target.config.industry,
          },
          includeFollowUp: target.config.followUps,
        });

        const evaluation: Evaluation = result.evaluation;
        let next: InterviewSession = {
          ...target,
          answers: {
            ...target.answers,
            [activeQuestion.id]: {
              ...target.answers[activeQuestion.id],
              evaluation,
              evaluationEngine: evaluation.engine,
            },
          },
        };

        // Attach a follow-up probe when one was produced and the candidate enabled them.
        if (result.followUp && target.config.followUps) {
          const exists = next.questions.some((q) => q.followUpFor === activeQuestion.id);
          const parentIsFollowUp = Boolean(activeQuestion.followUpFor);
          if (!exists && !parentIsFollowUp) {
            const followUp = buildFollowUpQuestion(activeQuestion, result.followUp);
            const questions = [...next.questions];
            questions.splice(next.questionIndex + 1, 0, followUp);
            next = { ...next, questions };
            setFollowUpAdded(true);
          }
        }

        if (result.note) push(result.note, 'warning');

        const feedback = transition(next, { type: 'SHOW_FEEDBACK' });
        if (feedback.ok) persist(feedback.session);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Evaluation failed.';
        setEvaluationError(message);
        const feedback = transition(target, { type: 'SHOW_FEEDBACK' });
        if (feedback.ok) persist(feedback.session);
        push('Evaluation failed. You can retry from the feedback screen.', 'error');
      } finally {
        setEvaluating(false);
      }
    },
    [persist, push],
  );

  const submitAnswer = useCallback(
    async (text: string) => {
      if (!session) return;
      setBusy(true);
      const outcome = transition(session, { type: 'SUBMIT', text });
      if (!outcome.ok) {
        push(outcome.error, 'warning');
        setBusy(false);
        return;
      }
      persist(outcome.session);
      clearDraft(outcome.session.id, outcome.session.questions[outcome.session.questionIndex]?.id ?? '');
      await runEvaluation(outcome.session, text.trim());
      setBusy(false);
    },
    [session, persist, runEvaluation, push],
  );

  const skipQuestion = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    const outcome = transition(session, { type: 'SUBMIT', skipped: true });
    if (!outcome.ok) {
      push(outcome.error, 'warning');
      setBusy(false);
      return;
    }
    persist(outcome.session);
    const feedback = transition(outcome.session, { type: 'SHOW_FEEDBACK' });
    if (feedback.ok) persist(feedback.session);
    setBusy(false);
  }, [session, persist, push]);

  const showFeedback = useCallback(() => {
    const outcome = send({ type: 'SHOW_FEEDBACK' });
    if (!outcome.ok && outcome.error) push(outcome.error, 'warning');
  }, [send, push]);

  const nextQuestion = useCallback(() => {
    if (!session) return;
    const nextOutcome = transition(session, { type: 'NEXT_QUESTION' });
    if (!nextOutcome.ok) {
      push(nextOutcome.error, 'warning');
      return;
    }
    const advanced = (current: InterviewSession) => {
      const hasNext = current.questionIndex + 1 < current.questions.length;
      if (!hasNext) {
        const done = transition(current, { type: 'COMPLETE' });
        if (done.ok) persist(done.session);
        return;
      }
      const shown = transition(current, { type: 'SHOW_QUESTION' });
      if (!shown.ok) return;
      persist({ ...shown.session, questionIndex: current.questionIndex + 1, answerStartedAt: undefined });
    };
    advanced(nextOutcome.session);
    setFollowUpAdded(false);
    setEvaluationError(null);
  }, [session, persist, push]);

  const retryEvaluation = useCallback(async () => {
    if (!session || !question) return;
    const answer = session.answers[question.id];
    const text = answer?.text ?? '';
    if (!text.trim()) return;
    await runEvaluation(session, text);
  }, [session, question, runEvaluation]);

  const start = useCallback(() => {
    if (!session) return;
    const started = transition(session, { type: 'START' });
    if (!started.ok) {
      push(started.error, 'warning');
      return;
    }
    const shown = transition(started.session, { type: 'SHOW_QUESTION' });
    persist(shown.ok ? shown.session : started.session);
  }, [session, persist, push]);

  const beginAnswer = useCallback(() => {
    const outcome = send({ type: 'BEGIN_ANSWER' });
    if (!outcome.ok && outcome.error) push(outcome.error, 'warning');
  }, [send, push]);

  const pause = useCallback(() => {
    const outcome = send({ type: 'PAUSE' });
    if (!outcome.ok && outcome.error) push(outcome.error, 'warning');
  }, [send, push]);

  const resume = useCallback(() => {
    const outcome = send({ type: 'RESUME' });
    if (!outcome.ok && outcome.error) push(outcome.error, 'warning');
  }, [send, push]);

  const endEarly = useCallback(() => {
    const outcome = send({ type: 'COMPLETE' });
    if (!outcome.ok && outcome.error) push(outcome.error, 'warning');
  }, [send, push]);

  const elapsedMs = session ? activeElapsedMs(session) : 0;
  const timeRemainingMs = session ? remainingMs(session) : 0;
  const expired = session ? isExpired(session) : false;
  const questionElapsedSeconds =
    session && session.answerStartedAt
      ? answerDurationSeconds(session.answerStartedAt, Date.now(), session.pausedAt, session.pausedMs)
      : 0;

  return {
    session,
    question,
    draft,
    elapsedMs,
    remainingMs: timeRemainingMs,
    questionElapsedSeconds,
    expired,
    busy,
    evaluating,
    evaluationError,
    followUpAdded,
    setDraft,
    send,
    start,
    beginAnswer,
    submitAnswer,
    skipQuestion,
    showFeedback,
    nextQuestion,
    pause,
    resume,
    endEarly,
    retryEvaluation,
  };
}

export type { Evaluation, InterviewQuestion, InterviewSession };
