import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Field, Input } from '../components/ui.js';
import { useStore } from '../state/store.js';
import { useToast } from '../state/toast.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn({ mode }: { mode: 'signin' | 'register' }) {
  const { db, update } = useStore();
  const { push } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState(db.profile?.name ?? '');
  const [email, setEmail] = useState(db.profile?.email ?? '');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const isRegister = mode === 'register';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (isRegister && name.trim().length < 2) nextErrors.name = 'Enter your name (at least 2 characters).';
    if (!EMAIL_RE.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (isRegister && db.profile && db.profile.email === email.trim()) {
      nextErrors.email = 'A local profile with this email already exists on this device. Use sign in instead.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const existing = db.profile?.email === email.trim() ? db.profile : null;
    if (isRegister && !existing && name.trim().length < 2) return;

    const profile = {
      name: isRegister ? name.trim() : (existing?.name ?? email.trim().split('@')[0]),
      email: email.trim(),
      authMode: 'local' as const,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      targetRole: existing?.targetRole,
    };

    const result = update((database) => ({ ...database, profile }));
    if (!result.ok) {
      push(result.error, 'error');
      return;
    }
    push(isRegister ? 'Local profile created on this device.' : 'Signed in to your local profile.', 'success');
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-navy-900/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">AI</span>
            <span className="text-sm font-semibold">AI Interviewer Pro</span>
          </Link>
          <Link to={isRegister ? '/signin' : '/register'} className="btn-ghost">
            {isRegister ? 'I already have a profile' : 'Create a profile'}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">{isRegister ? 'Create your profile' : 'Sign in'}</h1>
        <p className="mt-2 text-sm text-ink-dim">
          {isRegister
            ? 'Set up a local practice profile for this browser.'
            : 'Switch to the local profile registered on this device.'}
        </p>

        <Card className="mt-6 p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {isRegister ? (
              <Field label="Full name" htmlFor="name" error={errors.name} required>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                />
              </Field>
            ) : null}

            <Field label="Email" htmlFor="email" error={errors.email} required>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>

            <Button type="submit" className="w-full">
              {isRegister ? 'Create local profile' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-5 rounded-lg border border-warn/30 bg-warn/10 p-3 text-xs leading-relaxed text-warn">
            Local practice mode: your profile and interview history stay in this browser. No password is collected or
            stored, and nothing is uploaded to a server. Cloud sync is not configured for this deployment.
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-ink-faint">
          Want to look around first?{' '}
          <Link to="/library" className="underline hover:text-ink-dim">
            Browse the question library
          </Link>{' '}
          or{' '}
          <Link to="/" className="underline hover:text-ink-dim">
            go back home
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
