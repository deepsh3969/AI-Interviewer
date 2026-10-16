import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, PageHeader } from '../components/ui.js';
import { DimensionBarChart } from '../components/charts.js';
import { EvaluationBlock } from './InterviewRoom.js';
import { buildReport } from '../lib/report.js';
import { formatDuration } from '../lib/timer.js';
import { useStore } from '../state/store.js';

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const { db } = useStore();
  const session = db.sessions.find((s) => s.id === id);
  const report = useMemo(() => (session ? buildReport(session) : null), [session]);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  if (!session || !report) {
    return (
      <EmptyState
        title="Report not found"
        description="This session is not in local storage. It may have been deleted from this browser."
        action={
          <Link to="/history" className="btn-primary">
            Go to history
          </Link>
        }
      />
    );
  }

  const completedDate = (report.completedAt ?? report.createdAt).slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Performance report"
        subtitle={`${report.role} · ${report.interviewType} interview · ${completedDate}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => window.print()}>
              Print / save as PDF
            </Button>
            <Link to={`/interview/${session.id}/review`} className="btn-ghost">
              Review answers
            </Link>
            <Link to="/dashboard" className="btn-ghost">
              Dashboard
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-ink-faint">Overall practice score</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-5xl font-semibold text-ink">{report.overall ?? '—'}</span>
            {report.grade ? <Badge tone={report.grade === 'strong' ? 'success' : 'accent'}>{report.grade.replace('-', ' ')}</Badge> : null}
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            {report.evaluatedCount} of {report.totalQuestions} answers evaluated · practice feedback only, not a
            hiring score.
          </p>
        </Card>
        <Metric label="Answered" value={`${report.answeredCount}/${report.totalQuestions}`} />
        <Metric label="Practice time" value={formatDuration(report.practiceSeconds)} />
      </div>

      {report.enginesUsed.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {report.enginesUsed.includes('ai') ? <Badge tone="success">AI evaluation used</Badge> : null}
          {report.enginesUsed.includes('heuristic') ? (
            <Badge tone="warn">Rule-based heuristic used for some answers (not AI)</Badge>
          ) : null}
        </div>
      ) : null}

      {!report.insightsAvailable ? (
        <Card className="mt-4 border-warn/40 p-4 text-sm text-warn">
          Not enough evaluated answers to draw reliable patterns yet. Complete at least 3 evaluated answers for
          meaningful insights - nothing on this page is extrapolated for you.
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <DimensionBarChart items={report.dimensionAverages} title="Scores by evaluation dimension" />
          <p className="faint mt-3">
            Averages across evaluated answers in this session. Axes run 0-100; each bar shows the dimension mean.
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink">Question-by-question results</h3>
          <ul className="mt-3 space-y-2">
            {report.questionResults.map((result) => (
              <li key={result.questionId}>
                <button
                  type="button"
                  onClick={() => setOpenQuestion(openQuestion === result.questionId ? null : result.questionId)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-panel-2 px-3 py-2 text-left"
                  aria-expanded={openQuestion === result.questionId}
                >
                  <span className="line-clamp-1 text-sm text-ink-dim">
                    {result.index + 1}. {result.text}
                  </span>
                  <span className="shrink-0 text-xs">
                    {result.skipped ? (
                      <Badge tone="warn">skipped</Badge>
                    ) : result.score !== null ? (
                      <Badge tone={result.score >= 70 ? 'success' : result.score >= 50 ? 'accent' : 'danger'}>
                        {result.score}
                      </Badge>
                    ) : (
                      <Badge>not evaluated</Badge>
                    )}
                  </span>
                </button>
                {openQuestion === result.questionId ? (
                  <div className="mt-2 rounded-lg border border-line bg-panel p-4">
                    <p className="text-sm text-ink">{result.text}</p>
                    {result.answerText ? (
                      <>
                        <p className="faint mt-3">Your answer</p>
                        <p className="mt-1 whitespace-pre-wrap rounded-md bg-panel-2 p-3 text-sm text-ink-dim">
                          {result.answerText}
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-ink-faint">No answer submitted.</p>
                    )}
                    {result.evaluation ? (
                      <EvaluationBlock evaluation={result.evaluation} />
                    ) : (
                      <p className="mt-3 text-xs text-ink-faint">No evaluation for this answer.</p>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-success">Strongest answers</h3>
          {report.strongest.length === 0 ? (
            <p className="mt-2 text-sm text-ink-dim">No answer scored 60+ in this session.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm text-ink-dim">
              {report.strongest.map((r) => (
                <li key={r.questionId} className="rounded-md border border-line bg-panel-2 p-3">
                  <span className="font-medium text-ink">#{r.index + 1} · {r.score}</span> - {r.text}
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-5 text-sm font-semibold text-warn">Needs improvement</h3>
          {report.needsWork.length === 0 ? (
            <p className="mt-2 text-sm text-ink-dim">No answer scored below 60 - keep raising the difficulty.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm text-ink-dim">
              {report.needsWork.map((r) => (
                <li key={r.questionId} className="rounded-md border border-line bg-panel-2 p-3">
                  <span className="font-medium text-ink">#{r.index + 1} · {r.score}</span> - {r.text}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink">Recurring weaknesses</h3>
          {report.recurringWeaknesses.length === 0 ? (
            <p className="mt-2 text-sm text-ink-dim">No dimension fell below 60 in this session.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm text-ink-dim">
              {report.recurringWeaknesses.map((weakness) => (
                <li key={weakness.label} className="rounded-md border border-line bg-panel-2 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-ink">{weakness.label}</span>
                    <Badge tone="warn">{weakness.count} answer(s)</Badge>
                  </div>
                  <p className="faint mt-1">{weakness.detail}</p>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-5 text-sm font-semibold text-ink">Skills</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {report.skillsDemonstrated.length > 0 ? (
              report.skillsDemonstrated.map((skill) => (
                <Badge key={`demo-${skill}`} tone="success">
                  {skill}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-ink-dim">No skill reached the solid threshold this session.</span>
            )}
          </div>

          {report.revisionTopics.length > 0 ? (
            <>
              <h3 className="mt-5 text-sm font-semibold text-ink">Revision topics</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {report.revisionTopics.map((topic) => (
                  <Badge key={`rev-${topic}`} tone="warn">
                    {topic}
                  </Badge>
                ))}
              </div>
            </>
          ) : null}
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h3 className="text-sm font-semibold text-ink">Recommended next practice</h3>
        <p className="mt-2 text-sm text-ink-dim">{report.nextPractice}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/interview/new" className="btn-primary">
            Start a focused session
          </Link>
          <Link to="/library" className="btn-secondary">
            Practise from the library
          </Link>
        </div>
      </Card>

      <Card className="mt-6 border-warn/30 p-4">
        <h3 className="text-sm font-semibold text-warn">About this report</h3>
        <ul className="mt-2 space-y-1 text-xs text-ink-dim">
          {report.notes.map((note) => (
            <li key={note}>• {note}</li>
          ))}
          <li>• Charts label their axes and offer a data-table view for accessibility.</li>
        </ul>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </Card>
  );
}
