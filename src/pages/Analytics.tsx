import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, EmptyState, PageHeader, Stat } from '../components/ui.js';
import { DimensionBarChart, ScoreTrendChart } from '../components/charts.js';
import { summarizeHistory } from '../lib/analytics.js';
import { formatDuration } from '../lib/timer.js';
import { useStore } from '../state/store.js';

export default function Analytics() {
  const { db } = useStore();
  const summary = useMemo(() => summarizeHistory(db.sessions), [db.sessions]);

  if (summary.totalSessions === 0) {
    return (
      <div>
        <PageHeader title="Skill analytics" subtitle="Patterns computed from your own completed sessions." />
        <EmptyState
          title="No data yet"
          description="Complete a mock interview and this page will show dimension averages, skill levels and frequently missed criteria."
          action={
            <Link to="/interview/new" className="btn-primary">
              Start your first interview
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Skill analytics"
        subtitle="All figures come from your completed sessions. Nothing here is estimated or invented."
        actions={
          <Link to="/dashboard" className="btn-ghost">
            Dashboard
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sessions" value={summary.totalSessions} hint={`${summary.completedSessions} completed`} />
        <Stat label="Practice time" value={formatDuration(summary.totalPracticeSeconds)} hint="active time" />
        <Stat label="Average score" value={summary.averageScore ?? '—'} hint={summary.averageGrade ?? 'no evaluations yet'} />
        <Stat label="Tracked skills" value={summary.skillBreakdown.length} hint="across completed sessions" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          {summary.trendAvailable ? (
            <ScoreTrendChart points={summary.trend} title="Score trend over time" />
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-ink">Score trend over time</h3>
              <p className="mt-2 text-sm text-ink-dim">{summary.trendNote}</p>
            </div>
          )}
        </Card>

        <Card className="p-5">
          {summary.dimensionAverages.length > 0 ? (
            <DimensionBarChart items={summary.dimensionAverages} title="Average dimension scores" />
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-ink">Average dimension scores</h3>
              <p className="mt-2 text-sm text-ink-dim">No evaluated answers yet - complete an interview first.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink">Skill breakdown</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Skill
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Attempts
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Evaluated
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Avg score
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Level
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.skillBreakdown.map((skill) => (
                  <tr key={skill.skill} className="border-b border-line/50">
                    <td className="py-2 pr-3 text-ink">{skill.skill}</td>
                    <td className="py-2 pr-3 text-ink-dim">{skill.attempts}</td>
                    <td className="py-2 pr-3 text-ink-dim">{skill.evaluated}</td>
                    <td className="py-2 pr-3 text-ink-dim">{skill.averageScore ?? '—'}</td>
                    <td className="py-2">
                      {skill.level ? (
                        <Badge tone={skill.level === 'strong' ? 'success' : skill.level === 'needs-work' ? 'danger' : 'accent'}>
                          {skill.level.replace('-', ' ')}
                        </Badge>
                      ) : (
                        <Badge>no data</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="faint mt-3">Levels: below 40 needs work · 40-59 developing · 60-79 solid · 80+ strong.</p>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink">Frequently missed criteria</h3>
          {summary.frequentMisses.length === 0 ? (
            <p className="mt-2 text-sm text-ink-dim">
              No evaluation dimension has fallen below 60 yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {summary.frequentMisses.map((miss) => (
                <li key={miss.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink">{miss.label}</span>
                    <span className="text-ink-dim">
                      {miss.count} of {miss.of} answers below 60
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel">
                    <div
                      className="h-full bg-warn"
                      style={{ width: `${Math.round((miss.count / Math.max(1, miss.of)) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 rounded-lg border border-line bg-panel-2 p-4">
            <h4 className="text-sm font-semibold text-ink">What these numbers mean</h4>
            <ul className="mt-2 space-y-1 text-xs text-ink-faint">
              <li>• Scores describe written or spoken practice answers only.</li>
              <li>• They do not measure personality, honesty, confidence or emotion.</li>
              <li>• Trends appear only with 3+ completed, evaluated sessions.</li>
              <li>• Where AI is unavailable, scores come from a labelled rule-based heuristic.</li>
              {summary.notes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
