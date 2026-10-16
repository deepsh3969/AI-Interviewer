import { GitBranch, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * SECTION 08 — Closing footer.
 * Internal navigation and the real source repository only; no invented
 * company, social, or legal links. Year is generated at runtime.
 */

const GITHUB_URL = 'https://github.com/deepsh3969/AI-Interviewer';

export default function ShowcaseFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-showcase-line bg-showcase-2/60" aria-label="Footer">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="text-lg font-semibold tracking-tight text-showcase-ink">AI Interviewer Pro</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-showcase-dim">
              Practise realistic interviews, get structured feedback, and track your own progress - locally, at your
              pace.
            </p>
          </div>

          <nav aria-label="Product links">
            <p className="text-xs font-semibold uppercase tracking-wider text-showcase-dim">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/interview/new" className="text-showcase-dim transition-colors hover:text-showcase-ink">
                  Start an interview
                </Link>
              </li>
              <li>
                <Link to="/analytics" className="text-showcase-dim transition-colors hover:text-showcase-ink">
                  Analytics
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-showcase-dim transition-colors hover:text-showcase-ink">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-showcase-dim transition-colors hover:text-showcase-ink">
                  Help &amp; limitations
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Page links">
            <p className="text-xs font-semibold uppercase tracking-wider text-showcase-dim">On this page</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="#story" className="text-showcase-dim transition-colors hover:text-showcase-ink">
                  The story
                </a>
              </li>
              <li>
                <a href="#features" className="text-showcase-dim transition-colors hover:text-showcase-ink">
                  Features
                </a>
              </li>
              <li>
                <a href="#spotlight" className="text-showcase-dim transition-colors hover:text-showcase-ink">
                  Performance spotlight
                </a>
              </li>
              <li>
                <a href="#analytics" className="text-showcase-dim transition-colors hover:text-showcase-ink">
                  Analytics preview
                </a>
              </li>
              <li>
                <a href="#process" className="text-showcase-dim transition-colors hover:text-showcase-ink">
                  The practice loop
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Source links">
            <p className="text-xs font-semibold uppercase tracking-wider text-showcase-dim">Source</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-showcase-dim transition-colors hover:text-showcase-ink"
                >
                  <GitBranch size={14} aria-hidden /> GitHub repository
                </a>
              </li>
              <li>
                <a
                  href={`${GITHUB_URL}/issues`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-showcase-dim transition-colors hover:text-showcase-ink"
                >
                  Report an issue
                </a>
              </li>
              <li>
                <Link to="/signin" className="text-showcase-dim transition-colors hover:text-showcase-ink">
                  Sign in
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-showcase-line pt-6 text-xs text-showcase-dim sm:flex-row sm:items-center">
          <p>© {year} AI Interviewer Pro · open-source practice tool</p>
          <p className="inline-flex items-center gap-1.5">
            Built with React, GSAP and Gemini
            <Heart size={12} className="text-rose-400" aria-hidden />
          </p>
        </div>
      </div>
    </footer>
  );
}
