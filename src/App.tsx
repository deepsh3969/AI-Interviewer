import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { StoreProvider } from './state/store.js';
import { ToastProvider } from './state/toast.js';
import AppShell from './components/AppShell.js';
import Landing from './pages/Landing.js';
import SignIn from './pages/SignIn.js';
import Dashboard from './pages/Dashboard.js';
import InterviewSetup from './pages/InterviewSetup.js';
import InterviewRoom from './pages/InterviewRoom.js';
import AnswerReview from './pages/AnswerReview.js';
import Report from './pages/Report.js';
import History from './pages/History.js';
import Analytics from './pages/Analytics.js';
import Library from './pages/Library.js';
import Practice from './pages/Practice.js';
import Profile from './pages/Profile.js';
import Settings from './pages/Settings.js';
import NotFound from './pages/NotFound.js';

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
