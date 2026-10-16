import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const LINKS = [
  { id: 'story', label: 'Experience' },
  { id: 'features', label: 'Features' },
  { id: 'spotlight', label: 'Spotlight' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'process', label: 'Process' },
];

/**
 * Minimal fixed navigation for the showcase: scroll-spy highlight,
 * anchor links (CSS smooth scrolling with scroll-margin offsets on
 * sections), and a mobile disclosure menu.
 */
export default function ShowcaseNav() {
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Background only after leaving the very top.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll spy: the section crossing the viewport middle band owns the
  // highlight; when no linked section is in the band (hero, CTA), all
  // links rest instead of keeping a stale highlight.
  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActiveId(LINKS.find((link) => visible.has(link.id))?.id ?? null);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function linkClass(id: string): string {
    return `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      activeId === id ? 'text-showcase-ink' : 'text-showcase-dim hover:text-showcase-ink'
    }`;
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-showcase-line bg-showcase/85 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="AI Interviewer Pro home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-showcase-violet to-showcase-blue text-xs font-bold text-white">
            AI
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-showcase-ink sm:block">
            AI Interviewer Pro
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Showcase sections">
          {LINKS.map((link) => (
            <a key={link.id} href={`#${link.id}`} className={linkClass(link.id)} aria-current={activeId === link.id ? 'true' : undefined}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/signin" className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-showcase-dim transition-colors hover:text-showcase-ink sm:inline-flex">
            Sign in
          </Link>
          <Link to="/interview/new" className="sc-btn-primary !px-4 !py-2">
            Start Practicing
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-showcase-line text-showcase-dim transition-colors hover:text-showcase-ink lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="showcase-mobile-menu"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={17} aria-hidden /> : <Menu size={17} aria-hidden />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div id="showcase-mobile-menu" className="border-b border-showcase-line bg-showcase/95 backdrop-blur-md lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3" aria-label="Showcase sections (mobile)">
            {LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  activeId === link.id ? 'bg-showcase-2 text-showcase-ink' : 'text-showcase-dim'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link to="/signin" className="rounded-lg px-3 py-2.5 text-sm font-medium text-showcase-dim" onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
