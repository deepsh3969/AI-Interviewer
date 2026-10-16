import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { fetchStatus, type ApiStatus } from '../../lib/apiClient.js';
import { gsap, motionAllowed } from '../../lib/showcase/anim.js';
import { HeroVisual } from './mocks.js';

/**
 * SECTION 01 — Immersive hero.
 * Auto-playing entrance sequence (not scroll-gated), scroll-linked
 * background parallax on large screens, and honest provider status.
 */
export default function HeroSection() {
  const rootRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchStatus()
      .then((result) => {
        if (cancelled) return;
        setStatus(result);
        setStatusChecked(true);
      })
      .catch(() => {
        if (!cancelled) setStatusChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !motionAllowed()) return;

    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-hero-bg]', { autoAlpha: 0, scale: 1.05, duration: 1.2, ease: 'power2.out' })
        .from('[data-hero-eyebrow]', { autoAlpha: 0, y: 18, duration: 0.55 }, '-=0.75')
        .from('[data-hero-line]', { yPercent: 115, duration: 0.9, stagger: 0.12 }, '-=0.45')
        .from('[data-hero-copy]', { autoAlpha: 0, y: 20, duration: 0.7 }, '-=0.55')
        .from('[data-hero-cta]', { autoAlpha: 0, y: 16, duration: 0.5, stagger: 0.1 }, '-=0.45')
        .from('[data-hero-visual]', { autoAlpha: 0, y: 44, duration: 1 }, '-=1.05')
        .from('[data-hero-scroll]', { autoAlpha: 0, y: -8, duration: 0.5 }, '-=0.35');

      // Parallax depth: background layers drift slower than the page.
      mm.add('(min-width: 1024px)', () => {
        gsap.to('[data-parallax-far]', {
          yPercent: 24,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true },
        });
        gsap.to('[data-parallax-near]', {
          yPercent: 10,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true },
        });
      });
    }, root);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  return (
    <section ref={rootRef} id="hero" className="relative flex min-h-[100svh] items-center overflow-hidden pt-24 pb-20">
      {/* Atmospheric background */}
      <div className="pointer-events-none absolute inset-0" data-hero-bg aria-hidden>
        <div className="absolute inset-0 bg-showcase" />
        <div className="sc-glow-violet absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full blur-3xl" data-parallax-far />
        <div className="sc-glow-blue absolute top-1/3 -right-40 h-[560px] w-[560px] rounded-full blur-3xl" data-parallax-far />
        <div className="sc-grid-bg absolute inset-0" data-parallax-near />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-showcase" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        {/* Copy */}
        <div>
          <p className="flex flex-wrap items-center gap-3" data-hero-eyebrow>
            <span className="sc-eyebrow">AI-powered interview preparation</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-showcase-line px-2.5 py-1 text-[11px] text-showcase-dim">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  !statusChecked || status === null ? 'bg-showcase-dim/70' : status.aiConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
                aria-hidden
              />
              {!statusChecked
                ? 'Checking provider…'
                : status === null
                  ? 'Provider status unavailable · fallback bank'
                  : status.aiConfigured
                    ? 'AI provider configured'
                    : 'Curated fallback bank active'}
            </span>
          </p>

          <h1 className="mt-6 text-[clamp(2.6rem,7vw,4.75rem)] font-semibold leading-[1.03] tracking-[-0.035em] text-showcase-ink">
            <span className="block overflow-hidden pb-1">
              <span className="block" data-hero-line>
                Your next opportunity
              </span>
            </span>
            <span className="block overflow-hidden pb-1">
              <span className="block" data-hero-line>
                starts <span className="sc-gradient-text">here.</span>
              </span>
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-showcase-dim sm:text-lg" data-hero-copy>
            Practice real-world interviews, improve your answers, and build the confidence to perform when it matters.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/interview/new" className="sc-btn-primary" data-hero-cta>
              Start Practicing
            </Link>
            <a href="#story" className="sc-btn-ghost" data-hero-cta>
              Explore the Experience
            </a>
          </div>
        </div>

        {/* Visual */}
        <div data-hero-visual>
          <HeroVisual />
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#story"
        data-hero-scroll
        className="absolute inset-x-0 bottom-6 mx-auto flex w-fit flex-col items-center gap-1.5 text-showcase-dim transition-colors hover:text-showcase-ink"
        aria-label="Scroll to the experience section"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em]">Scroll</span>
        <ChevronDown size={16} className="animate-pulse" aria-hidden />
      </a>
    </section>
  );
}
