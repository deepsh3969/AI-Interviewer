import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Card, EmptyState, PageHeader } from '../components/ui.js';
import { EvaluationBlock } from './InterviewRoom.js';
import { formatDuration } from '../lib/timer.js';
import { useStore } from '../state/store.js';

export default function AnswerReview() {
  const { id } = useParams<{ id: string }>();
  const { db } = useStore();
  const session = db.sessions.find((s) => s.id === id);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);

  if (!session) {
    return (
      <EmptyState
        title="Session not found"
        description="This interview is not available in local storage."
        action={
          <Link to="/history" className="btn-primary">
            Go to history
          </Link>
        }
      />
    );
  }

  const answered = session.questions.filter((q) => session.answers[q.id]?.submittedAt);

  return (
    <div>
      <PageHeader
        title="Answer review"
        subtitle={`${session.config.role} · ${answered.length} of ${session.questions.length} questions answered`}
        actions={
          <>
            <Link to={`/report/${session.id}`} className="btn-secondary">
              Full report
            </Link>
            <Link to="/dashboard" className="btn-ghost">
              Dashboard
            </Link>
          </>
        }
      />

      <div className="space-y-4">
        {session.questions.map((question, index) => {
          const answer = session.answers[question.id];
          const submitted = Boolean(answer?.submittedAt);
          return (
            <Card key={question.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge tone="accent">Q{index + 1}</Badge>
                <Badge>{question.category}</Badge>
                <Badge>{question.difficulty}</Badge>
                {question.followUpFor ? <Badge tone="accent">Follow-up</Badge> : null}
                {answer?.skipped ? <Badge tone="warn">Skipped</Badge> : null}
                {answer?.evaluation ? (
                  <Badge tone={answer.evaluation.overall >= 70 ? 'success' : 'accent'}>
                    Score {answer.evaluation.overall}
                  </Badge>
                ) : null}
              </div>

              <h2 className="mt-3 text-base font-medium text-ink">{question.text}</h2>

              {submitted && answer ? (
                <>
                  <p className="faint mt-3">
                    Your answer · {answer.text.trim().split(/\s+/).length} words ·{' '}
                    {formatDuration(answer.durationSeconds)} spent
                  </p>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-navy-900 p-3 text-sm text-ink-dim">
                    {answer.text || '(no text - skipped)'}
                  </p>

                  {answer.evaluation ? (
                    <div className="mt-3">
                      <button
                        type="button"
                        className="btn-ghost text-xs"
                        onClick={() => setShowFeedback(showFeedback === question.id ? null : question.id)}
                        aria-expanded={showFeedback === question.id}
                      >
                        {showFeedback === question.id ? 'Hide feedback' : 'Show feedback'}
                      </button>
                      {showFeedback === question.id ? <EvaluationBlock evaluation={answer.evaluation} /> : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-ink-faint">No evaluation was stored for this answer.</p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm text-ink-faint">Not answered.</p>
              )}
            </Card>
          );
        })}
      </div>

      {!session.completedAt ? (
        <Card className="mt-6 border-accent/40 p-4 text-sm text-ink-dim">
          This session is still in progress.{' '}
          <Link to={`/interview/${session.id}`} className="text-accent-2 underline">
            Return to the interview room
          </Link>
          .
        </Card>
      ) : null}
    </div>
  );
}
