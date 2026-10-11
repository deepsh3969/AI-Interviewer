import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, Modal, PageHeader, Progress, Spinner } from '../components/ui';
import { useInterview, type UseInterviewResult } from '../hooks/useInterview';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { fetchStatus, transcribeAudio } from '../lib/apiClient';
import { formatClock } from '../lib/timer';
import { useStore } from '../state/store';
import { useToast } from '../state/toast';
import type { Evaluation } from '../lib/types';

export default function InterviewRoom() {
  const { id } = useParams<{ id: string }>();
  const interview = useInterview(id);
  const { session } = interview;

  if (!session) {
    return (
      <Card className="p-8 text-center">
        <h1 className="text-lg font-semibold">Session not found</h1>
        <p className="mt-2 text-sm text-ink-dim">
          This interview does not exist in local storage. It may have been deleted from this browser.
        </p>
        <Link to="/dashboard" className="btn-primary mt-4 inline-flex">
          Back to dashboard
        </Link>
      </Card>
    );
  }

  return <Room interview={interview} />;
}

function Room({ interview }: { interview: UseInterviewResult }) {
  const {
    session,
    question,
    draft,
    remainingMs,
    questionElapsedSeconds,
    expired,
    busy,
    evaluating,
    evaluationError,
    followUpAdded,
    setDraft,
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
  } = interview;

  const { db, update } = useStore();
  const { push } = useToast();
  const navigate = useNavigate();
  const preferences = db.preferences;

  const [confirmSkip, setConfirmSkip] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [sendingRemote, setSendingRemote] = useState(false);
  const [remoteConsent, setRemoteConsent] = useState(false);
  const [providerStatus, setProviderStatus] = useState<{ speechConfigured: boolean } | null>(null);

  const synthesis = useSpeechSynthesis();
  const recorder = useAudioRecorder();
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const lastFinalRef = useRef('');

  const rec = useSpeechRecognition({
    lang: preferences.speechLang,
    onFinal: (text) => {
      const previous = lastFinalRef.current;
      const delta = (text.startsWith(previous) ? text.slice(previous.length) : text).trim();
      lastFinalRef.current = text;
      if (delta) {
        const base = draftRef.current.trim();
        setDraft(base ? `${base} ${delta}` : delta);
      }
    },
  });

  useEffect(() => {
    fetchStatus()
      .then(setProviderStatus)
      .catch(() => setProviderStatus(null));
  }, []);

  const questionKey = question?.id;
  useEffect(() => {
    lastFinalRef.current = '';
    if (questionKey && preferences.autoReadAloud) {
      const text = interview.session?.questions.find((q) => q.id === questionKey)?.text;
      if (text) synthesis.speak(text, { rate: preferences.speechRate, lang: preferences.speechLang });
    }
    // Auto-read only when the active question changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionKey]);

  useEffect(() => {
    if (expired && !timeUp && session && !session.completedAt) {
      rec.stop();
      setTimeUp(true);
    }
  }, [expired, timeUp, session, rec]);

  const evaluation: Evaluation | undefined = question ? session?.answers[question.id]?.evaluation : undefined;
  const answerRecord = question && session ? session.answers[question.id] : undefined;

  const readQuestion = useCallback(() => {
    if (!question) return;
    synthesis.speak(question.text, { rate: preferences.speechRate, lang: preferences.speechLang });
  }, [question, synthesis, preferences.speechRate, preferences.speechLang]);

  const handleRemoteTranscribe = useCallback(async () => {
    if (!recorder.recording) {
      if (!preferences.allowRemoteTranscription && !remoteConsent) {
        setRemoteConsent(true);
        return;
      }
      setSendingRemote(true);
      const started = await recorder.start();
      setSendingRemote(false);
      if (!started && recorder.error) push(recorder.error, 'error');
      return;
    }
    setSendingRemote(true);
    try {
      const audio = await recorder.stop();
      if (!audio) return;
      const result = await transcribeAudio(audio.base64, audio.mimeType, preferences.speechLang);
      const base = draftRef.current.trim();
      setDraft(base ? `${base} ${result.text}` : result.text);
      push(`Transcribed by ${result.provider}. Review the text before submitting.`, 'success');
    } catch (err) {
      push(err instanceof Error ? err.message : 'Transcription failed.', 'error');
    } finally {
      setSendingRemote(false);
    }
  }, [recorder, preferences, remoteConsent, setDraft, push]);

  const enableRemote = useCallback(() => {
    update((database) => ({ ...database, preferences: { ...database.preferences, allowRemoteTranscription: true } }));
    setRemoteConsent(false);
  }, [update]);

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const isSpokenMode = session?.config.mode === 'spoken';
  const canUseMic = rec.supported;
  const remoteReady = providerStatus?.speechConfigured === true;

  if (!session) return null;

  const questionNumber = session.questionIndex + 1;
  const totalQuestions = session.questions.length;
  const sourceBadge =
    session.generatedByAi ? (
      <Badge tone="success">AI-generated plan</Badge>
    ) : (
      <Badge tone="warn">Fallback question bank</Badge>
    );

  if (session.state === 'ready') {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Interview ready" subtitle="Review the plan, then start when you are comfortable." />
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            {sourceBadge}
            <Badge tone="accent">{session.config.type}</Badge>
            <Badge>{session.config.experience}</Badge>
          </div>
          <h2 className="mt-4 text-lg font-semibold">{session.config.role}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Meta label="Questions" value={String(totalQuestions)} />
            <Meta label="Duration" value={`${session.config.durationMinutes} minutes`} />
            <Meta label="Difficulty" value={session.config.difficulty} />
            <Meta label="Answers" value={session.config.mode === 'typed' ? 'Typed' : 'Spoken (typed fallback)'} />
            <Meta label="Follow-ups" value={session.config.followUps ? 'Enabled' : 'Disabled'} />
            <Meta label="Industry" value={session.config.industry || 'Not specified'} />
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={start} className="px-6 py-3">
              Start interview
            </Button>
            <Link to="/dashboard" className="btn-ghost">
              Discard and go back
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-faint">
            Your draft answers are saved locally as you type, so a refresh will not lose your work.
          </p>
        </Card>
      </div>
    );
  }

  if (session.state === 'completed' || session.state === 'abandoned') {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title={session.state === 'completed' ? 'Interview complete' : 'Interview ended'}
          subtitle={
            session.state === 'completed'
              ? 'Every submitted answer has been scored. Your report is ready.'
              : 'This session was ended before completion. Partial answers are kept in your history.'
          }
        />
        <Card className="p-6">
          <div className="flex flex-wrap gap-3">
            <Link to={`/report/${session.id}`} className="btn-primary">
              View performance report
            </Link>
            <Link to={`/interview/${session.id}/review`} className="btn-secondary">
              Review answers
            </Link>
            <Link to="/dashboard" className="btn-ghost">
              Dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Question ${questionNumber} of ${totalQuestions}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {sourceBadge}
            {session.pausedAt ? <Badge tone="warn">Paused</Badge> : null}
            {followUpAdded ? <Badge tone="accent">Follow-up added</Badge> : null}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-lg border px-3 py-1.5 font-mono text-sm ${
                remainingMs < 60_000 ? 'border-danger/40 bg-danger/10 text-danger' : 'border-line bg-panel text-ink'
              }`}
              aria-label="Time remaining"
            >
              {formatClock(remainingMs)} left
            </span>
            {session.pausedAt ? (
              <Button variant="secondary" onClick={resume}>
                Resume
              </Button>
            ) : (
              <Button variant="ghost" onClick={pause}>
                Pause
              </Button>
            )}
            <Button variant="danger" onClick={() => setConfirmEnd(true)}>
              End early
            </Button>
          </div>
        }
      />

      <Progress value={questionNumber} max={totalQuestions} label="Session progress" />

      {session.pausedAt ? (
        <Card className="mt-4 border-warn/40 p-4 text-sm text-warn">
          The session is paused - the timer is stopped. Resume when you are ready.
        </Card>
      ) : null}

      {question ? (
        <Card className="mt-4 p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge tone="accent">{question.category}</Badge>
            <Badge>{question.difficulty}</Badge>
            <Badge>Skill · {question.skill}</Badge>
            {question.followUpFor ? <Badge tone="accent">Follow-up probe</Badge> : null}
            <span className="faint">Suggested: {Math.round(question.timeLimitSeconds / 60)} min</span>
          </div>

          <h2 className="mt-4 text-xl font-medium leading-relaxed text-ink" aria-live="polite">
            {question.text}
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={readQuestion} disabled={!synthesis.supported}>
              🔊 Read aloud
            </Button>
            <Button variant="ghost" onClick={() => synthesis.stop()} disabled={!synthesis.speaking}>
              Stop reading
            </Button>
            <Button
              variant="ghost"
              onClick={() => synthesis.pause()}
              disabled={!synthesis.speaking || synthesis.paused}
            >
              Pause reading
            </Button>
            <Button variant="ghost" onClick={() => synthesis.resume()} disabled={!synthesis.paused}>
              Resume
            </Button>
          </div>
          {!synthesis.supported ? (
            <p className="faint mt-2">Speech synthesis is unavailable in this browser.</p>
          ) : null}
          {synthesis.error ? <p className="mt-2 text-xs text-danger">{synthesis.error}</p> : null}

          <details className="mt-5 rounded-lg border border-line bg-navy-900 p-4">
            <summary className="cursor-pointer text-sm font-medium text-ink-dim">
              What evaluators look for (rubric)
            </summary>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-dim">
              {question.criteria.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <span className="text-accent-2">•</span>
                  {c.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-faint">Suggested structure:</p>
            <ol className="mt-1 list-inside list-decimal space-y-1 text-xs text-ink-faint">
              {question.answerStructure.map((step, i) => (
                <li key={`${question.id}-s${i}`}>{step}</li>
              ))}
            </ol>
          </details>
        </Card>
      ) : null}

      {/* ANSWERING */}
      {session.state === 'answering' && question ? (
        <Card className="mt-4 p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Your answer</h3>
            <span className="faint">
              {wordCount} words · {formatClock(questionElapsedSeconds * 1000)} on this answer · draft saved locally
            </span>
          </div>

          <textarea
            className="input min-h-48 text-sm leading-relaxed"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your answer, or use voice input below. You can edit the transcript before submitting."
            aria-label="Your answer"
            autoFocus={session.config.mode === 'typed'}
          />

          <div className="mt-4 space-y-3 rounded-lg border border-line bg-navy-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-ink">Voice input</h4>
              <MicStatus rec={rec} />
            </div>

            {canUseMic ? (
              <div className="flex flex-wrap gap-2">
                {rec.status === 'listening' ? (
                  <Button variant="secondary" onClick={rec.stop}>
                    ■ Stop dictation
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      lastFinalRef.current = '';
                      rec.start();
                    }}
                    disabled={Boolean(session.pausedAt)}
                  >
                    ● Start dictation
                  </Button>
                )}
                <Button variant="ghost" onClick={rec.reset} disabled={rec.status === 'listening'}>
                  Clear transcript
                </Button>
              </div>
            ) : (
              <p className="text-xs text-ink-faint">
                Browser speech recognition is not available here (works best in Chrome/Edge). Typed answers always
                work.
              </p>
            )}

            {rec.error ? <p className="text-xs text-danger">{rec.error}</p> : null}
            {rec.interim ? <p className="text-xs italic text-ink-dim">Hearing: “{rec.interim}”</p> : null}
            {rec.status === 'listening' ? (
              <p className="faint">Listening… interim text appears here. Correct anything before you submit.</p>
            ) : null}

            <div className="border-t border-line pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-ink">Remote transcription (optional)</h4>
                <Badge tone={remoteReady ? 'success' : 'neutral'}>
                  {remoteReady ? 'Provider configured' : 'Not configured'}
                </Badge>
              </div>
              {remoteReady ? (
                <>
                  <p className="faint mt-1">
                    Records locally and sends audio to the configured transcription provider. Nothing is uploaded
                    unless you press this button.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={handleRemoteTranscribe}
                    disabled={sendingRemote || Boolean(session.pausedAt)}
                    className="mt-2"
                  >
                    {sendingRemote ? 'Working…' : recorder.recording ? '■ Stop & transcribe' : '● Record & transcribe'}
                  </Button>
                  {recorder.error ? <p className="mt-2 text-xs text-danger">{recorder.error}</p> : null}
                </>
              ) : (
                <p className="faint mt-1">
                  No transcription provider is configured on this deployment. Use browser dictation or type instead.
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                rec.stop();
                void submitAnswer(draft);
              }}
              disabled={busy || evaluating || draft.trim().length < 10}
            >
              {busy || evaluating ? 'Submitting…' : 'Submit answer'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmSkip(true)} disabled={busy}>
              Skip question
            </Button>
            <span className="faint">Minimum 10 characters - a sentence is enough to get feedback.</span>
          </div>
        </Card>
      ) : null}

      {/* QUESTION (not yet answering) */}
      {session.state === 'question' ? (
        <Card className="mt-4 p-6">
          <p className="text-sm text-ink-dim">
            Take a moment to structure your thoughts. When you start, the per-question timer begins and your draft is
            saved as you type.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={beginAnswer} disabled={Boolean(session.pausedAt)}>
              {isSpokenMode ? 'Start answering (voice or text)' : 'Start answering'}
            </Button>
            <Link to={`/interview/${session.id}/review`} className="btn-ghost">
              Review previous answers
            </Link>
          </div>
        </Card>
      ) : null}

      {/* SUBMITTED / EVALUATING */}
      {session.state === 'submitted' ? (
        <Card className="mt-4 p-6">
          {evaluating ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Spinner label="Evaluating your answer…" />
              <p className="text-center text-xs text-ink-faint">
                Your answer is being scored against this question&apos;s rubric. This takes a few seconds.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink-dim">Answer saved. Preparing feedback…</span>
              <Button variant="secondary" onClick={showFeedback}>
                Show feedback
              </Button>
            </div>
          )}
        </Card>
      ) : null}

      {/* FEEDBACK */}
      {session.state === 'feedback' && question ? (
        <Card className="mt-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Feedback</h3>
            <div className="flex gap-2">
              <Link to={`/interview/${session.id}/review`} className="btn-ghost">
                All answers
              </Link>
              <Button onClick={nextQuestion} className="btn-primary">
                {session.questionIndex + 1 < session.questions.length ? 'Next question' : 'Finish interview'}
              </Button>
            </div>
          </div>

          {answerRecord?.skipped ? (
            <p className="mt-4 text-sm text-ink-dim">
              Question skipped - it will not affect your score. Skipped questions stay visible in your report.
            </p>
          ) : null}

          {evaluationError && !evaluation ? (
            <div className="mt-4 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
              <p>{evaluationError}</p>
              <Button variant="secondary" className="mt-3" onClick={() => void retryEvaluation()}>
                Retry evaluation
              </Button>
            </div>
          ) : null}

          {evaluation ? <EvaluationBlock evaluation={evaluation} /> : null}

          {followUpAdded ? (
            <div className="mt-4 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm text-ink-dim">
              <span className="font-medium text-accent-2">Follow-up probe added.</span> The next question digs into
              something your answer left unclear - it counts as part of this interview.
            </div>
          ) : null}
        </Card>
      ) : null}

      {session.state === 'next-question' ? (
        <Card className="mt-4 p-6">
          <Spinner label="Loading next question…" />
        </Card>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-faint print:hidden">
        <span>
          Session id: <span className="font-mono">{session.id}</span>
        </span>
        <span>Answers and progress persist locally - refreshing is safe.</span>
      </div>

      <Modal
        open={confirmSkip}
        title="Skip this question?"
        onClose={() => setConfirmSkip(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmSkip(false)}>
              Keep answering
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmSkip(false);
                rec.stop();
                void skipQuestion();
              }}
            >
              Skip question
            </Button>
          </>
        }
      >
        <p>
          The question will be marked skipped and excluded from scoring. You can still see it in the report and come
          back to practise it from the library.
        </p>
      </Modal>

      <Modal
        open={confirmEnd}
        title="End the interview now?"
        onClose={() => setConfirmEnd(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
              Continue interview
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmEnd(false);
                rec.stop();
                synthesis.stop();
                endEarly();
              }}
            >
              End interview
            </Button>
          </>
        }
      >
        <p>
          Submitted answers keep their feedback. Unanswered questions are marked as not attempted, and you will go
          straight to the report.
        </p>
      </Modal>

      <Modal
        open={timeUp}
        title="Time is up"
        onClose={() => setTimeUp(false)}
        footer={
          <Button
            onClick={() => {
              setTimeUp(false);
              endEarly();
              navigate(`/report/${session.id}`);
            }}
          >
            View my report
          </Button>
        }
      >
        <p>
          The {session.config.durationMinutes}-minute session budget has been used. Your submitted answers are safe -
          finish now to generate the report.
        </p>
      </Modal>

      <Modal
        open={remoteConsent}
        title="Send audio to a transcription provider?"
        onClose={() => setRemoteConsent(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoteConsent(false)}>
              Not now
            </Button>
            <Button onClick={enableRemote}>Allow & record</Button>
          </>
        }
      >
        <p>
          Remote transcription sends your microphone audio to the transcription provider configured for this
          deployment. Nothing is uploaded without your approval, and you can turn this off any time in Settings.
        </p>
      </Modal>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-navy-900 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}

function MicStatus({ rec }: { rec: ReturnType<typeof useSpeechRecognition> }) {
  const label =
    rec.status === 'listening'
      ? 'Listening'
      : rec.status === 'requesting'
        ? 'Requesting microphone…'
        : rec.status === 'denied'
          ? 'Permission denied'
          : rec.status === 'error'
            ? 'Error'
            : rec.status === 'unsupported'
              ? 'Unsupported'
              : 'Idle';
  const tone =
    rec.status === 'listening'
      ? 'border-success/40 bg-success/10 text-success'
      : rec.status === 'denied' || rec.status === 'error'
        ? 'border-danger/40 bg-danger/10 text-danger'
        : 'border-line bg-panel-2 text-ink-dim';
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs ${tone}`}>
      {rec.status === 'listening' ? '● ' : ''}
      {label}
    </span>
  );
}

export function EvaluationBlock({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-4xl font-semibold text-ink">{evaluation.overall}</span>
        <div>
          <Badge tone={evaluation.grade === 'strong' ? 'success' : evaluation.grade === 'needs-work' ? 'danger' : 'accent'}>
            {evaluation.grade.replace('-', ' ')}
          </Badge>
          <p className="mt-1 text-xs text-ink-faint">
            {evaluation.engine === 'ai' ? 'AI evaluation' : 'Rule-based heuristic (not AI)'} · out of 100
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {evaluation.dimensions.map((dim) => (
          <div key={dim.id} className="rounded-lg border border-line bg-navy-900 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink">{dim.label}</span>
              <span className="font-mono text-ink-dim">{dim.score}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel">
              <div
                className={`h-full rounded-full ${dim.score >= 70 ? 'bg-success' : dim.score >= 50 ? 'bg-warn' : 'bg-danger'}`}
                style={{ width: `${dim.score}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-faint">{dim.evidence}</p>
          </div>
        ))}
      </div>

      {evaluation.strengths.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-success">Strengths</h4>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-ink-dim">
            {evaluation.strengths.map((s, i) => (
              <li key={`strength-${i}`}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {evaluation.weaknesses.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-warn">What to fix</h4>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-ink-dim">
            {evaluation.weaknesses.map((s, i) => (
              <li key={`weak-${i}`}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {evaluation.missing.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-ink-dim">Missing elements</h4>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-ink-dim">
            {evaluation.missing.map((s, i) => (
              <li key={`missing-${i}`}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {evaluation.suggestions.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-accent-2">Suggestions</h4>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-ink-dim">
            {evaluation.suggestions.map((s, i) => (
              <li key={`suggestion-${i}`}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-lg border border-line bg-navy-900 p-4">
        <h4 className="text-sm font-semibold text-ink">A stronger structure</h4>
        <p className="faint mt-1">Illustrative only - not the only correct answer.</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-ink-dim">
          {evaluation.modelAnswerOutline.map((line, i) => (
            <li key={`outline-${i}`}>{line}</li>
          ))}
        </ol>
      </div>

      <p className="text-xs leading-relaxed text-ink-faint">{evaluation.disclaimer}</p>
    </div>
  );
}
