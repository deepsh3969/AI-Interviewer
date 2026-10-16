import { Suspense, lazy, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { StoreProvider } from './state/store.js';
import { ToastProvider } from './state/toast.js';
import AppShell from './components/AppShell.js';
import ErrorBoundary from './components/ErrorBoundary.js';
import { PageSkeleton } from './components/ui.js';
import Landing from './pages/Landing.js';
import NotFound from './pages/NotFound.js';

const SignIn = lazy(() => import('./pages/SignIn.js'));
const Dashboard = lazy(() => import('./pages/Dashboard.js'));
const InterviewSetup = lazy(() => import('./pages/InterviewSetup.js'));
const InterviewRoom = lazy(() => import('./pages/InterviewRoom.js'));
const AnswerReview = lazy(() => import('./pages/AnswerReview.js'));
const Report = lazy(() => import('./pages/Report.js'));
const History = lazy(() => import('./pages/History.js'));
const Analytics = lazy(() => import('./pages/Analytics.js'));
const Library = lazy(() => import('./pages/Library.js'));
const Practice = lazy(() => import('./pages/Practice.js'));
const Profile = lazy(() => import('./pages/Profile.js'));
const Settings = lazy(() => import('./pages/Settings.js'));
const Help = lazy(() => import('./pages/Help.js'));

/** Wrap a lazily loaded page in Suspense + the shared error boundary. */
function Page({ component: Component }: { component: ComponentType }) {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<PageSkeleton />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}

function SignInRoute() {
  return <SignIn mode="signin" />;
}

function RegisterRoute() {
  return <SignIn mode="register" />;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <Routes location={location}>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<Page component={SignInRoute} />} />
      <Route path="/register" element={<Page component={RegisterRoute} />} />
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Page component={Dashboard} />} />
        <Route path="/interview/new" element={<Page component={InterviewSetup} />} />
        <Route path="/interview/:id" element={<Page component={InterviewRoom} />} />
        <Route path="/interview/:id/review" element={<Page component={AnswerReview} />} />
        <Route path="/report/:id" element={<Page component={Report} />} />
        <Route path="/history" element={<Page component={History} />} />
        <Route path="/analytics" element={<Page component={Analytics} />} />
        <Route path="/library" element={<Page component={Library} />} />
        <Route path="/practice/:questionId" element={<Page component={Practice} />} />
        <Route path="/profile" element={<Page component={Profile} />} />
        <Route path="/settings" element={<Page component={Settings} />} />
        <Route path="/help" element={<Page component={Help} />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  );
}
