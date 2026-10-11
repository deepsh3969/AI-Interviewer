import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchStatus, type ApiStatus } from '../lib/apiClient';

const FEATURES = [
  {
    title: 'Realistic mock interviews',
    body: 'Configure role, level, industry, type and difficulty, then run a stateful session with a timer, drafts and safe recovery.',
  },
  {
    title: 'Spoken and typed answers',
    body: 'Answer by voice where your browser supports speech recognition, or type. Transcripts are always editable before you submit.',
  },
  {
    title: 'Structured evaluation',
    body: 'When an AI provider is configured, answers are graded on question-specific rubrics with evidence, strengths and fixes.',
  },
  {
    title: 'Honest fallbacks',
    body: 'Without credentials the app uses a curated question bank and a clearly labelled rule-based heuristic - never fake AI.',
  },
  {
    title: 'Reports and analytics',
    body: 'Dimension scores, recurring weaknesses, skill trends and practice recommendations from your real session history.',
  },
  {
    title: 'Private by default',
    body: 'Local practice mode keeps everything in this browser. Export or delete your data at any time from Settings.',
  },
];

const STEPS = [
  'Pick a role, interview type and question count',
  'Answer one question at a time by voice or text',
  'Get structured feedback with evidence and a stronger outline',
  'Track trends across sessions and practise weak skills',
];

export default function Landing() {
  const [status, setStatus] = useState<ApiStatus | null>(null);

  useEffect(() => {
    fetchStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-navy-900/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">AI</span>
            <span className="text-sm font-semibold">AI Interviewer Pro</span>
          </div>
          <nav className="flex items-center gap-2" aria-label="Account">
            <Link to="/library" className="btn-ghost">
              Question library
            </Link>
            <Link to="/signin" className="btn-secondary">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-ink-dim">
              <span
                className={`h-2 w-2 rounded-full ${status?.aiConfigured ? 'bg-success' : 'bg-warn'}`}
                aria-hidden
              />
              {status === null
                ? 'Checking AI provider status…'
                : status.aiConfigured
                  ? `AI evaluation configured · ${status.model ?? 'model set'}`
                  : 'AI not configured · curated fallback bank active'}
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Practice Smarter.
              <br />
              Speak Confidently.
              <span className="text-accent-2"> Get Hired.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-dim">
              AI Interviewer Pro runs realistic mock interviews, listens to your spoken or typed answers, and returns
              structured, question-specific feedback you can actually act on - then tracks your improvement over time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary px-5 py-3">
                Start practising free
              </Link>
              <Link to="/interview/new" className="btn-secondary px-5 py-3">
                Configure an interview
              </Link>
            </div>
            <p className="mt-4 text-xs text-ink-faint">
              No account sync: this deployment stores data locally in your browser. Feedback is for practice only and
              does not predict hiring outcomes.
            </p>
          </div>
        </section>

        <section className="border-y border-line bg-navy-900/50">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="card p-5">
                <h2 className="text-base font-semibold text-ink">{feature.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-dim">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-xl font-semibold">How a session works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step} className="card p-5">
                <span className="text-xs font-semibold text-accent-2">STEP {index + 1}</span>
                <p className="mt-2 text-sm text-ink-dim">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-line bg-navy-900/50">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-xl font-semibold">Ready when you are</h2>
              <p className="mt-1 text-sm text-ink-dim">
                Build a plan in under a minute. Typed answers always work; voice input works where your browser
                supports it.
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/register" className="btn-primary">
                Create local profile
              </Link>
              <Link to="/library" className="btn-secondary">
                Browse questions
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-4 py-6 text-center text-xs text-ink-faint">
        AI Interviewer Pro · Built for practice, not for hiring decisions ·{' '}
        <Link to="/settings" className="underline hover:text-ink-dim">
          Privacy & data
        </Link>
      </footer>
    </div>
  );
}
