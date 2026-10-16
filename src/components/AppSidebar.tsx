import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bookmark,
  HelpCircle,
  LayoutDashboard,
  Library,
  LogOut,
  PlayCircle,
  Settings,
  History,
  UserRound,
} from 'lucide-react';
import { Button, Modal } from './ui.js';
import { useStore } from '../state/store.js';
import { useToast } from '../state/toast.js';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  /** Optional custom active check (query-string routes). */
  isCustomActive?: (pathname: string, search: string) => boolean;
}

const MAIN_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/interview/new', label: 'Practice Interview', icon: PlayCircle },
  { to: '/history', label: 'Interview History', icon: History },
  {
    to: '/library',
    label: 'Question Library',
    icon: Library,
    isCustomActive: (path, search) => path === '/library' && !search.includes('view=saved'),
  },
  { to: '/analytics', label: 'Performance Analytics', icon: BarChart3 },
];

const SECONDARY_NAV: NavItem[] = [
  {
    to: '/library?view=saved',
    label: 'Saved Questions',
    icon: Bookmark,
    isCustomActive: (path, search) => path === '/library' && search.includes('view=saved'),
  },
  { to: '/help', label: 'Help & Support', icon: HelpCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { db, update } = useStore();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const inProgress = db.sessions.filter((s) => !['completed', 'abandoned'].includes(s.state)).length;

  function itemClass(isActive: boolean): string {
    return `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-white/10 text-white'
        : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
    }`;
  }

  function renderItem(item: NavItem) {
    const active = item.isCustomActive
      ? item.isCustomActive(location.pathname, location.search)
      : item.to === '/interview/new'
        ? location.pathname.startsWith('/interview')
        : location.pathname === item.to;
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={itemClass(active)}
        aria-current={active ? 'page' : undefined}
      >
        <Icon size={17} aria-hidden />
        <span className="flex-1">{item.label}</span>
        {item.to === '/dashboard' && inProgress > 0 ? (
          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
            {inProgress}
          </span>
        ) : null}
      </NavLink>
    );
  }

  function handleSignOut() {
    const result = update((database) => ({ ...database, signedIn: false }));
    if (!result.ok) {
      push(result.error, 'error');
      return;
    }
    setConfirmSignOut(false);
    onNavigate?.();
    push('Signed out. Your data stays on this device.', 'success');
    navigate('/signin');
  }

  const initials = (db.profile?.name ?? db.profile?.email ?? 'G')
    .replace(/[^a-zA-Z ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'G';

  return (
    <div className="flex h-full flex-col bg-sidebar text-white">
      {/* Brand */}
      <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-4 py-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white shadow-sm">
          AI
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-white">AI Interviewer</span>
          <span className="block text-[11px] font-medium text-gray-400">Pro · interview practice</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Primary">
        <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Menu</p>
        <div className="space-y-0.5">{MAIN_NAV.map(renderItem)}</div>
        <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Workspace
        </p>
        <div className="space-y-0.5">{SECONDARY_NAV.map(renderItem)}</div>
      </nav>

      {/* Footer: account */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 px-1.5 py-1.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/90 text-xs font-semibold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-white">
              {db.profile?.name ?? 'Guest'}
            </p>
            <p className="truncate text-[11px] text-gray-400">
              {db.profile?.email ?? 'No local profile yet'}
            </p>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <Link
            to="/profile"
            onClick={onNavigate}
            className="flex flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-100"
          >
            <UserRound size={14} aria-hidden />
            Profile
          </Link>
          <button
            type="button"
            onClick={() => setConfirmSignOut(true)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-100"
          >
            <LogOut size={14} aria-hidden />
            Sign out
          </button>
        </div>
        <p className="mt-2 px-1.5 text-[10px] leading-relaxed text-gray-500">
          Local practice mode · feedback is practice-only, not a hiring assessment.
        </p>
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
            <Button variant="primary" onClick={handleSignOut}>
              Sign out
            </Button>
          </>
        }
      >
        <p>
          You will return to the sign-in screen. Your interviews, answers and settings stay saved on this device.
        </p>
      </Modal>
    </div>
  );
}
