import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { fetchStatus, type ApiStatus } from '../lib/apiClient';
import { useStore } from '../state/store';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/interview/new', label: 'New interview' },
  { to: '/history', label: 'History' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/library', label: 'Question library' },
  { to: '/profile', label: 'Profile' },
  { to: '/settings', label: 'Settings' },
];

export default function AppShell() {
  const { db } = useStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchStatus()
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const inProgress = db.sessions.filter((s) => !['completed', 'abandoned'].includes(s.state));

  const navItems = (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-accent-soft text-accent-2' : 'text-ink-dim hover:bg-panel-2 hover:text-ink'
            }`
          }
        >
          {item.label}
          {item.to === '/dashboard' && inProgress.length > 0 ? (
            <span className="ml-2 rounded-full bg-warn/20 px-1.5 py-0.5 text-[10px] text-warn">{inProgress.length}</span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-navy-900 lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <Link to="/" className="mb-6 flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">AI</span>
            <span className="text-sm font-semibold leading-tight">
              AI Interviewer
              <span className="block text-[11px] font-normal text-ink-faint">Pro</span>
            </span>
          </Link>
          {navItems}
          <div className="mt-auto space-y-3">
            <div className="rounded-lg border border-line bg-panel p-3">
              <p className="text-xs font-medium text-ink-dim">AI status</p>
              <p className="mt-1 text-xs text-ink-faint">
                {status === null
                  ? 'Checking…'
                  : status.aiConfigured
                    ? `Configured · ${status.model ?? 'model set'}`
                    : 'Not configured · fallback active'}
              </p>
            </div>
            <p className="px-2 text-[11px] leading-relaxed text-ink-faint">
              Practice feedback only. Not a hiring assessment.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-navy-900/90 backdrop-blur print:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">AI</span>
              <span className="text-sm font-semibold">AI Interviewer Pro</span>
            </Link>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="faint">Local practice mode</span>
              {status?.aiConfigured ? (
                <span className="faint rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-success">
                  AI evaluation ready
                </span>
              ) : (
                <span className="faint rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-warn">
                  AI not configured
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary hidden sm:inline-flex"
                onClick={() => navigate('/interview/new')}
              >
                Start interview
              </button>
              <span
                className="hidden h-8 w-8 items-center justify-center rounded-full border border-line bg-panel-2 text-xs font-semibold text-ink-dim sm:flex"
                aria-hidden
              >
                {(db.profile?.name ?? 'G').slice(0, 1).toUpperCase()}
              </span>
              <button
                type="button"
                className="btn-ghost lg:hidden"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-label="Toggle navigation menu"
              >
                ☰
              </button>
            </div>
          </div>
          {menuOpen ? (
            <div className="border-t border-line bg-navy-900 p-3 lg:hidden">{navItems}</div>
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>

        <footer className="border-t border-line px-4 py-4 text-center text-[11px] text-ink-faint print:hidden">
          AI Interviewer Pro · Practice smarter. Speak confidently. Get hired. · Feedback is practice-only and may
          contain errors.
        </footer>
      </div>
    </div>
  );
}
