import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { fetchStatus, type ApiStatus } from '../lib/apiClient.js';
import { useStore } from '../state/store.js';
import AppSidebar from './AppSidebar.js';
import TopBar from './TopBar.js';

export default function AppShell() {
  const { db } = useStore();
  const location = useLocation();
  // undefined = request in flight, null = /api/status unreachable, object = live status
  const [status, setStatus] = useState<ApiStatus | null | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchStatus()
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  // Explicit sign-out guard: keep the user signed out until they sign in again.
  if (db.signedIn === false) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block print:hidden">
        <div className="sticky top-0 h-screen">
          <AppSidebar />
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${drawerOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!drawerOpen}
      >
        <div
          className={`absolute inset-0 bg-overlay/45 transition-opacity duration-200 ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-pop transition-transform duration-200 ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <AppSidebar onNavigate={() => setDrawerOpen(false)} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar status={status} onOpenMenu={() => setDrawerOpen(true)} />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
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
