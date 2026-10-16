import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
      <p className="text-6xl font-semibold text-accent">404</p>
      <h1 className="mt-3 text-xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-ink-dim">
        The page you are looking for does not exist or the link is out of date. Your interview data is still safe in
        this browser.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="btn-primary">
          Go home
        </Link>
        <Link to="/dashboard" className="btn-secondary">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
