import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  HelpCircle,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import type { ApiStatus } from '../lib/apiClient.js';
import { allBankQuestions } from '../lib/questionBank.js';
import { useStore } from '../state/store.js';
import { IconButton, Modal, Button } from './ui.js';
import { useToast } from '../state/toast.js';

interface Crumb {
  label: string;
  to?: string;
}

const PAGE_TITLES: { match: (path: string) => boolean; title: string; to: string }[] = [
  { match: (p) => p === '/dashboard', title: 'Overview', to: '/dashboard' },
  { match: (p) => p.startsWith('/interview'), title: 'Practice Interview', to: '/interview/new' },
  { match: (p) => p.startsWith('/report'), title: 'Report', to: '/history' },
  { match: (p) => p === '/history', title: 'Interview History', to: '/history' },
  { match: (p) => p === '/library', title: 'Question Library', to: '/library' },
  { match: (p) => p === '/analytics', title: 'Performance Analytics', to: '/analytics' },
  { match: (p) => p === '/profile', title: 'Profile', to: '/profile' },
  { match: (p) => p === '/settings', title: 'Settings', to: '/settings' },
  { match: (p) => p === '/help', title: 'Help & Support', to: '/help' },
];

interface SearchGroup {
  title: string;
  items: { key: string; label: string; sub: string; to: string }[];
}

export default function TopBar({
  status,
  onOpenMenu,
}: {
  /** undefined = checking, null = /api/status unreachable, object = live status. */
  status: ApiStatus | null | undefined;
  onOpenMenu: () => void;
}) {
  const { db, update } = useStore();
  const { push } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const searchWrapRef = useRef<HTMLDivElement>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close popovers on route change / outside click / Escape.
  useEffect(() => {
    setSearchOpen(false);
    setQuery('');
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (searchWrapRef.current && !searchWrapRef.current.contains(target)) setSearchOpen(false);
      if (menuWrapRef.current && !menuWrapRef.current.contains(target)) setMenuOpen(false);
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMenuOpen(false);
      }
      const target = event.target as HTMLElement | null;
      const typing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Breadcrumb from the current route.
  const crumbs = useMemo<Crumb[]>(() => {
    const entry = PAGE_TITLES.find((p) => p.match(location.pathname));
    if (!entry) return [{ label: 'Overview', to: '/dashboard' }];
    const list: Crumb[] = [{ label: 'Overview', to: '/dashboard' }];
    if (entry.title !== 'Overview') list.push({ label: entry.title, to: entry.to });

    if (location.pathname.startsWith('/report/')) {
      const session = db.sessions.find((s) => s.id === location.pathname.split('/')[2]);
      if (session) list.push({ label: session.config.role });
    } else if (location.pathname.startsWith('/interview/') && location.pathname !== '/interview/new') {
      const session = db.sessions.find((s) => s.id === location.pathname.split('/')[2]);
      if (session) list.push({ label: session.config.role });
    } else if (location.pathname === '/library' && location.search.includes('view=saved')) {
      list[list.length - 1] = { label: 'Saved Questions', to: '/library?view=saved' };
    }
    return list;
  }, [location.pathname, location.search, db.sessions]);

  // Functional search across pages, interviews, saved and library questions.
  const results = useMemo<SearchGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const pages: SearchGroup['items'] = [
      { label: 'Overview', sub: 'Page', to: '/dashboard', key: 'p-dashboard' },
      { label: 'Start a practice interview', sub: 'Page', to: '/interview/new', key: 'p-new' },
      { label: 'Interview history', sub: 'Page', to: '/history', key: 'p-history' },
      { label: 'Question library', sub: 'Page', to: '/library', key: 'p-library' },
      { label: 'Saved questions', sub: 'Page', to: '/library?view=saved', key: 'p-saved' },
      { label: 'Performance analytics', sub: 'Page', to: '/analytics', key: 'p-analytics' },
      { label: 'Settings', sub: 'Page', to: '/settings', key: 'p-settings' },
      { label: 'Help & support', sub: 'Page', to: '/help', key: 'p-help' },
    ]
      .filter((p) => p.label.toLowerCase().includes(q))
      .slice(0, 4);

    const sessions = db.sessions
      .filter((s) => `${s.config.role} ${s.config.type} ${s.config.industry}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map((s) => ({
        key: `s-${s.id}`,
        label: s.config.role,
        sub:
          s.state === 'completed'
            ? 'Interview report'
            : s.state === 'abandoned'
              ? 'Ended early · report'
              : 'Resume interview',
        to: s.state === 'completed' || s.state === 'abandoned' ? `/report/${s.id}` : `/interview/${s.id}`,
      }));

    const bank = allBankQuestions()
      .filter((question) => `${question.text} ${question.skill}`.toLowerCase().includes(q))
      .slice(0, 5)
      .map((question) => ({
        key: `q-${question.id}`,
        label: question.text,
        sub: `Question · ${question.skill}`,
        to: `/practice/${question.id}`,
      }));

    const saved = db.savedQuestions
      .filter((s) => `${s.question.text} ${s.question.skill}`.toLowerCase().includes(q))
      .slice(0, 3)
      .map((s) => ({
        key: `sq-${s.id}`,
        label: s.question.text,
        sub: 'Saved question',
        to: `/practice/${s.question.id}`,
      }));

    const groups: SearchGroup[] = [];
    if (sessions.length) groups.push({ title: 'Interviews', items: sessions });
    if (saved.length) groups.push({ title: 'Saved questions', items: saved });
    if (bank.length) groups.push({ title: 'Question library', items: bank });
    if (pages.length) groups.push({ title: 'Pages', items: pages });
    return groups.slice(0, 4);
  }, [query, db.sessions, db.savedQuestions]);

  const flatResults = results.flatMap((group) => group.items);

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && flatResults.length > 0) {
      event.preventDefault();
      navigate(flatResults[0].to);
      setSearchOpen(false);
      inputRef.current?.blur();
    }
  }

  const initials = (db.profile?.name ?? db.profile?.email ?? 'G')
    .replace(/[^a-zA-Z ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'G';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-panel/90 backdrop-blur print:hidden">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
        <IconButton label="Open navigation" className="lg:hidden" onClick={onOpenMenu}>
          <Menu size={18} aria-hidden />
        </IconButton>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm md:flex">
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <ChevronRight size={13} className="shrink-0 text-ink-faint" aria-hidden /> : null}
              {index === crumbs.length - 1 ? (
                <span className="truncate font-medium text-ink" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.to ?? '/dashboard'} className="truncate text-ink-dim hover:text-ink">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Search */}
        <div ref={searchWrapRef} className="relative ml-auto w-full max-w-xs sm:max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={searchOpen && query.trim().length >= 2}
            aria-controls="topbar-search-results"
            aria-label="Search interviews, questions and pages"
            placeholder="Search…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            className="input h-9 pl-9 pr-10"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-panel-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-faint sm:block">
            /
          </kbd>

          {searchOpen && query.trim().length >= 2 ? (
            <div
              id="topbar-search-results"
              role="listbox"
              className="absolute left-0 right-0 top-11 z-40 max-h-96 overflow-y-auto rounded-xl border border-line bg-panel p-2 shadow-pop"
            >
              {flatResults.length === 0 ? (
                <p className="px-2 py-3 text-sm text-ink-dim">No matches for “{query.trim()}”.</p>
              ) : (
                results.map((group) => (
                  <div key={group.title} className="mb-1.5 last:mb-0">
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      {group.title}
                    </p>
                    {group.items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => {
                          navigate(item.to);
                          setSearchOpen(false);
                          setQuery('');
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-panel-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">{item.label}</span>
                          <span className="block truncate text-[11px] text-ink-faint">{item.sub}</span>
                        </span>
                        <ChevronRight size={14} className="shrink-0 text-ink-faint" aria-hidden />
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>

        {/* Status chip */}
        <span
          className="hidden items-center gap-1.5 rounded-full border border-line bg-panel-2 px-2.5 py-1 text-[11px] font-medium text-ink-dim xl:inline-flex"
          title={
            status === undefined
              ? 'Checking provider status'
              : status === null
                ? 'Could not reach /api/status - question generation still works with the labelled fallback bank'
                : status.aiConfigured
                  ? `AI provider configured${status.model ? ` · ${status.model}` : ''}`
                  : 'No AI provider configured - curated question bank and labelled heuristic are active'
          }
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === undefined ? 'bg-ink-faint' : status === null ? 'bg-warn' : status.aiConfigured ? 'bg-success' : 'bg-warn'
            }`}
            aria-hidden
          />
          {status === undefined
            ? 'Checking…'
            : status === null
              ? 'API offline'
              : status.aiConfigured
                ? 'AI ready'
                : 'Fallback mode'}
        </span>

        {/* Primary action */}
        <Link to="/interview/new" className="btn-primary h-9 shrink-0 px-3">
          <Plus size={15} aria-hidden />
          <span className="hidden sm:inline">Start Interview</span>
          <span className="sm:hidden">Start</span>
        </Link>

        {/* Profile menu */}
        <div ref={menuWrapRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Open account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel-2 text-xs font-semibold text-ink-dim transition-colors hover:border-accent hover:text-accent-2"
          >
            {initials}
          </button>
          {menuOpen ? (
            <div
              role="menu"
              aria-label="Account"
              className="absolute right-0 top-11 z-40 w-60 rounded-xl border border-line bg-panel p-1.5 shadow-pop"
            >
              <div className="border-b border-line px-2.5 py-2">
                <p className="truncate text-sm font-medium text-ink">{db.profile?.name ?? 'Guest'}</p>
                <p className="truncate text-xs text-ink-faint">{db.profile?.email ?? 'No local profile yet'}</p>
                <span className="mt-1.5 inline-block rounded border border-line bg-panel-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-dim">
                  Local profile
                </span>
              </div>
              <Link to="/profile" role="menuitem" className="mt-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-dim hover:bg-panel-2 hover:text-ink">
                <UserRound size={15} aria-hidden /> Profile
              </Link>
              <Link to="/settings" role="menuitem" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-dim hover:bg-panel-2 hover:text-ink">
                <Settings size={15} aria-hidden /> Settings
              </Link>
              <Link to="/help" role="menuitem" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-dim hover:bg-panel-2 hover:text-ink">
                <HelpCircle size={15} aria-hidden /> Help &amp; support
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmSignOut(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-dim hover:bg-panel-2 hover:text-ink"
              >
                <LogOut size={15} aria-hidden /> Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        open={confirmSignOut}
        title="Sign out?"
        onClose={() => setConfirmSignOut(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmSignOut(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const result = update((database) => ({ ...database, signedIn: false }));
                if (!result.ok) {
                  push(result.error, 'error');
                  return;
                }
                setConfirmSignOut(false);
                push('Signed out. Your data stays on this device.', 'success');
                navigate('/signin');
              }}
            >
              Sign out
            </Button>
          </>
        }
      >
        <p>You will return to the sign-in screen. Your interviews, answers and settings stay saved on this device.</p>
      </Modal>
    </header>
  );
}
