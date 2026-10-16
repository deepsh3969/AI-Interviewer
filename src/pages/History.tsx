import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Modal, PageHeader, Select } from '../components/ui.js';
import { summarizeHistory } from '../lib/analytics.js';
import { formatDuration } from '../lib/timer.js';
import { deleteSession } from '../lib/storage.js';
import { useStore } from '../state/store.js';
import { useToast } from '../state/toast.js';

type Filter = 'all' | 'completed' | 'in-progress' | 'abandoned';

export default function History() {
  const { db, refresh } = useStore();
  const { push } = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const rows = useMemo(() => {
    const sorted = [...db.sessions].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    return sorted.filter((session) => {
      if (filter === 'all') return true;
      if (filter === 'completed') return session.state === 'completed';
      if (filter === 'abandoned') return session.state === 'abandoned';
      return !['completed', 'abandoned'].includes(session.state);
    });
  }, [db.sessions, filter]);

  const summary = useMemo(() => summarizeHistory(db.sessions), [db.sessions]);

  function confirmDelete() {
    if (!pendingDelete) return;
    const result = deleteSession(pendingDelete);
    if (result.ok) {
      refresh();
      push('Session deleted from this browser.', 'success');
    } else {
      push(result.error, 'error');
    }
    setPendingDelete(null);
  }

  return (
    <div>
      <PageHeader
        title="Interview history"
        subtitle="Every session stored in this browser. Deleting a session removes its answers and feedback."
        actions={
          <div className="w-44">
            <Select aria-label="Filter sessions" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="all">All sessions</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In progress</option>
              <option value="abandoned">Ended early</option>
            </Select>
          </div>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'No interviews yet' : 'No sessions match this filter'}
          description={
            filter === 'all'
              ? 'Start a mock interview and it will appear here with its report and answers.'
              : 'Try a different filter.'
          }
          action={
            filter === 'all' ? (
              <Link to="/interview/new" className="btn-primary">
                Configure an interview
              </Link>
            ) : (
              <Button variant="secondary" onClick={() => setFilter('all')}>
                Clear filter
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((session) => {
            const answered = session.questions.filter((q) => session.answers[q.id]?.submittedAt).length;
            const inFlight = !['completed', 'abandoned'].includes(session.state);
            return (
              <Card key={session.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-ink">{session.config.role}</h2>
                      <Badge tone="accent">{session.config.type}</Badge>
                      <Badge>{session.config.experience}</Badge>
                      {session.generatedByAi ? <Badge tone="success">AI questions</Badge> : <Badge tone="warn">Fallback bank</Badge>}
                      {inFlight ? <Badge tone="warn">{session.state}</Badge> : null}
                    </div>
                    <p className="faint mt-1">
                      {session.updatedAt.slice(0, 16).replace('T', ' ')} · {answered}/{session.questions.length} answered ·{' '}
                      {session.config.questionCount} planned · {session.config.durationMinutes} min budget
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {inFlight ? (
                      <Link to={`/interview/${session.id}`} className="btn-primary">
                        Resume
                      </Link>
                    ) : (
                      <>
                        <Link to={`/report/${session.id}`} className="btn-secondary">
                          Report
                        </Link>
                        <Link to={`/interview/${session.id}/review`} className="btn-ghost">
                          Answers
                        </Link>
                      </>
                    )}
                    <Button variant="danger" onClick={() => setPendingDelete(session.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-6 p-4">
        <p className="text-xs text-ink-faint">
          Total sessions stored: {db.sessions.length} · drafts kept: {Object.keys(db.drafts).length} · practice
          time: {formatDuration(summary.totalPracticeSeconds)} ·{' '}
          <Link to="/settings" className="underline">
            export or delete all data
          </Link>
        </p>
      </Card>

      <Modal
        open={pendingDelete !== null}
        title="Delete this session?"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete permanently
            </Button>
          </>
        }
      >
        <p>
          The session, its answers, evaluations and drafts are removed from this browser. This cannot be undone -
          export your data first if you want a copy.
        </p>
      </Modal>
    </div>
  );
}
