import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Stat } from '../components/ui.js';
import { ScoreTrendChart } from '../components/charts.js';
import { summarizeHistory } from '../lib/analytics.js';
import { formatDuration } from '../lib/timer.js';
import { useStore } from '../state/store.js';
import { useToast } from '../state/toast.js';

export default function Dashboard() {
  const { db, update } = useStore();
  const { push } = useToast();
  const [goalTarget, setGoalTarget] = useState(5);
  const [goalScore, setGoalScore] = useState(70);

  const summary = useMemo(() => summarizeHistory(db.sessions), [db.sessions]);
  const inProgress = db.sessions.filter((s) => !['completed', 'abandoned'].includes(s.state));
  const recent = summary.recent;
  const firstName = db.profile?.name?.split(' ')[0] ?? 'there';

  function handleAddGoal() {
    const result = update((database) => ({
      ...database,
      goals: [
        {
          id: `goal_${Date.now()}`,
          label: `${goalTarget} interviews · avg ${goalScore}`,
          targetSessions: goalTarget,
          targetScore: goalScore,
          createdAt: new Date().toISOString(),
        },
        ...database.goals,
      ].slice(0, 20),
    }));
    if (result.ok) push('Goal added.', 'success');
    else push(result.error, 'error');
  }

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Your practice history, trends and next best actions."
        actions={
          <>
            <Link to="/interview/new" className="btn-primary">
              New interview
            </Link>
            <Link to="/library" className="btn-secondary">
              Practice a question
            </Link>
          </>
        }
      />

      {inProgress.length > 0 ? (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-accent/40 p-4">
          <div>
            <p className="text-sm font-medium text-ink">You have {inProgress.length} interview(s) in progress</p>
            <p className="faint mt-1">Pick up where you left off - drafts and progress are saved.</p>
          </div>
          <Link to={`/interview/${inProgress[0].id}`} className="btn-primary">
            Resume {inProgress[0].config.role}
          </Link>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Completed interviews" value={summary.completedSessions} hint={`of ${summary.totalSessions} total sessions`} />
        <Stat
          label="Practice time"
          value={formatDuration(summary.totalPracticeSeconds)}
          hint="active time across all sessions"
        />
        <Stat
          label="Average score"
          value={summary.averageScore ?? '—'}
          hint={summary.averageGrade ? `grade: ${summary.averageGrade.replace('-', ' ')}` : 'complete an interview with evaluations'}
        />
        <Stat label="Saved questions" value={db.savedQuestions.length} hint={`${db.practice.length} practice attempts`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          {summary.trendAvailable ? (
            <ScoreTrendChart points={summary.trend} title="Overall score by session" />
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-ink">Score trend</h3>
              <p className="mt-2 text-sm text-ink-dim">{summary.trendNote}</p>
              <p className="mt-2 text-xs text-ink-faint">
                Trends are only shown with enough real history so the chart never overstates your progress.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink">Recommended next practice</h3>
          {summary.recommendedAreas.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-ink-dim">
              {summary.recommendedAreas.map((area) => (
                <li key={area} className="flex items-center justify-between gap-2">
                  <span>{area}</span>
                  <Link to="/library" className="text-xs text-accent-2 underline">
                    practise
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-dim">
              {summary.completedSessions === 0
                ? 'Finish an interview to unlock skill-based recommendations.'
                : 'No weak skill areas detected yet - try a harder difficulty or a new interview type.'}
            </p>
          )}

          <div className="mt-5 border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-ink">Personal goals</h3>
            {db.goals.length === 0 ? (
              <p className="mt-2 text-xs text-ink-faint">No goals yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {db.goals.map((goal) => {
                  const progress = Math.min(summary.completedSessions, goal.targetSessions);
                  return (
                    <li key={goal.id} className="rounded-lg border border-line bg-navy-900 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-ink">{goal.label}</span>
                        <button
                          type="button"
                          className="text-xs text-ink-faint hover:text-danger"
                          onClick={() =>
                            update((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== goal.id) }))
                          }
                          aria-label={`Remove goal ${goal.label}`}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${(progress / Math.max(1, goal.targetSessions)) * 100}%` }}
                        />
                      </div>
                      <p className="faint mt-1">
                        {progress}/{goal.targetSessions} interviews · target avg {goal.targetScore}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Field label="Interviews" htmlFor="goal-sessions">
                <Input
                  id="goal-sessions"
                  type="number"
                  min={1}
                  max={100}
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(Number(e.target.value))}
                />
              </Field>
              <Field label="Avg score" htmlFor="goal-score">
                <Input
                  id="goal-score"
                  type="number"
                  min={1}
                  max={100}
                  value={goalScore}
                  onChange={(e) => setGoalScore(Number(e.target.value))}
                />
              </Field>
            </div>
            <Button variant="secondary" className="mt-2 w-full" onClick={handleAddGoal}>
              Add goal
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent sessions</h2>
          <Link to="/history" className="text-sm text-accent-2 underline">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Configure your first mock interview - it takes about a minute and you can answer by voice or text."
            action={
              <Link to="/interview/new" className="btn-primary">
                Configure an interview
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3">
            {recent.map((session) => {
              const inFlight = !['completed', 'abandoned'].includes(session.state);
              const score = session.score;
              return (
                <Card key={session.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {session.role} · <span className="text-ink-dim">{session.type}</span>
                    </p>
                    <p className="faint mt-1">
                      {session.date} · {session.questionCount} questions ·{' '}
                      {session.state === 'completed' ? 'completed' : session.state === 'abandoned' ? 'ended early' : 'in progress'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {score !== null && !inFlight ? (
                      <Badge tone={score >= 70 ? 'success' : score >= 50 ? 'accent' : 'warn'}>Score {score}</Badge>
                    ) : null}
                    {inFlight ? (
                      <Link to={`/interview/${session.id}`} className="btn-secondary">
                        Resume
                      </Link>
                    ) : (
                      <Link to={`/report/${session.id}`} className="btn-secondary">
                        Report
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {summary.notes.length > 0 ? (
        <Card className="mt-6 border-warn/30 p-4">
          <ul className="space-y-1 text-xs text-warn">
            {summary.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
