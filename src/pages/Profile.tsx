import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Field, Input, PageHeader, Stat } from '../components/ui';
import { summarizeHistory } from '../lib/analytics';
import { formatDuration } from '../lib/timer';
import { useStore } from '../state/store';
import { useToast } from '../state/toast';

const TARGET_ROLES = [
  'Software Engineer',
  'Data Analyst',
  'Data Scientist',
  'Product Manager',
  'UX Designer',
  'Marketing Manager',
  'Customer Support Specialist',
];

export default function Profile() {
  const { db, update } = useStore();
  const { push } = useToast();

  const [name, setName] = useState(db.profile?.name ?? '');
  const [email, setEmail] = useState(db.profile?.email ?? '');
  const [targetRole, setTargetRole] = useState(db.profile?.targetRole ?? '');

  const summary = useMemo(() => summarizeHistory(db.sessions), [db.sessions]);

  function save() {
    if (!name.trim() || !email.trim()) {
      push('Name and email are required for the local profile.', 'error');
      return;
    }
    const existing = db.profile;
    const result = update((database) => ({
      ...database,
      profile: {
        name: name.trim(),
        email: email.trim(),
        authMode: 'local',
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        targetRole: targetRole.trim() || undefined,
      },
    }));
    if (result.ok) push('Profile saved locally.', 'success');
    else push(result.error, 'error');
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Local practice profile stored only in this browser. No password is collected and nothing is uploaded to a server."
        actions={
          <Link to="/settings" className="btn-ghost">
            Settings
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Your details</h2>
          <div className="mt-4 space-y-4">
            <Field label="Name" htmlFor="profile-name" required>
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
            </Field>
            <Field label="Email" htmlFor="profile-email" required hint="Used only as your local sign-in identifier.">
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Target role" htmlFor="profile-role" hint="Pre-fills new interview configurations.">
              <Input
                id="profile-role"
                list="target-roles"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
              />
              <datalist id="target-roles">
                {TARGET_ROLES.map((role) => (
                  <option key={role} value={role} />
                ))}
              </datalist>
            </Field>
            <Button variant="primary" onClick={save}>
              Save profile
            </Button>
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <Badge tone="accent">authMode: local</Badge>
            <p className="faint mt-2">
              There is no cloud account, password hash or session cookie. Clearing browser storage removes this
              profile permanently - export your data first from Settings.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Completed interviews" value={summary.completedSessions} />
            <Stat label="Average score" value={summary.averageScore ?? '—'} />
            <Stat label="Practice time" value={formatDuration(summary.totalPracticeSeconds)} />
            <Stat label="Saved questions" value={db.savedQuestions.length} />
          </div>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">Account actions</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-dim">
              <li>
                <Link to="/settings" className="text-accent-2 underline">
                  Export all data
                </Link>{' '}
                - download a JSON copy of sessions, answers and preferences.
              </li>
              <li>
                <Link to="/settings" className="text-accent-2 underline">
                  Delete all data
                </Link>{' '}
                - permanently wipe this browser&apos;s local database.
              </li>
              <li>
                <Link to="/history" className="text-accent-2 underline">
                  Review session history
                </Link>{' '}
                - delete individual sessions from there.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
