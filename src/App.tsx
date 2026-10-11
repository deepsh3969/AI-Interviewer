import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { StoreProvider } from './state/store';
import { ToastProvider } from './state/toast';
import AppShell from './components/AppShell';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';
import InterviewSetup from './pages/InterviewSetup';
import InterviewRoom from './pages/InterviewRoom';
import AnswerReview from './pages/AnswerReview';
import Report from './pages/Report';
import History from './pages/History';
import Analytics from './pages/Analytics';
import Library from './pages/Library';
import Practice from './pages/Practice';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function AppRoutes() {
  const location = useLocation();
  return (
    <Routes location={location}>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<SignIn mode="signin" />} />
      <Route path="/register" element={<SignIn mode="register" />} />
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/interview/new" element={<InterviewSetup />} />
        <Route path="/interview/:id" element={<InterviewRoom />} />
        <Route path="/interview/:id/review" element={<AnswerReview />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="/history" element={<History />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/library" element={<Library />} />
        <Route path="/practice/:questionId" element={<Practice />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
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
