import { useLayoutEffect, useRef } from 'react';
import {
  BarChart3,
  ListChecks,
  MessagesSquare,
  Mic2,
  Sparkles,
  Target,
} from 'lucide-react';
import { gsap, motionAllowed } from '../../lib/showcase/anim.js';

/**
 * SECTION 03 — Animated product demonstration.
 * Six feature cards (all implemented in the app) reveal in a staggered
 * sequence; hover elevation stays pure CSS. Entrance clears inline
 * transforms so hover never fights the animation.
 */

const FEATURES = [
  {
    icon: MessagesSquare,
    title: 'AI-powered mock interviews',
    copy: 'Stateful sessions with timers, question flow and safe recovery - run a full interview end to end.',
  },
  {
    icon: Target,
    title: 'Role-specific question generation',
    copy: 'Question sets are built for your role, level and interview type - from the configured AI provider or the curated bank.',
  },
  {
    icon: Sparkles,
    title: 'Answer evaluation and feedback',
    copy: 'Every answer is scored on relevance, structure, clarity and evidence, always labelled with its source.',
  },
  {
    icon: BarChart3,
    title: 'Interview performance analytics',
    copy: 'Dimension averages, skill trends and recurring weaknesses - shown only when real history supports them.',
  },
  {
    icon: Mic2,
    title: 'Voice practice where supported',
    copy: 'Answer by voice through the browser speech API, with typed answers always available as the fallback.',
  },
  {
    icon: ListChecks,
    title: 'Personalized preparation recommendations',
    copy: 'Sessions end with prioritized next steps drawn from your own history - which skills to drill and what to run next.',
  },
];

export default function FeaturesSection() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !motionAllowed()) return;

    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      gsap.from('[data-feature-card]', {
        autoAlpha: 0,
        y: 36,
        duration: 0.65,
        ease: 'power2.out',
        stagger: 0.1,
        clearProps: 'transform,opacity,visibility',
        scrollTrigger: { trigger: '[data-feature-grid]', start: 'top 78%', once: true },
      });

      // Subtle depth: background wash drifts slower than the grid.
      mm.add('(min-width: 1024px)', () => {
        gsap.to('[data-features-glow]', {
          yPercent: 18,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
    }, root);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  return (
    <section ref={rootRef} id="features" className="sc-section overflow-hidden" aria-labelledby="features-title">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="sc-glow-blue absolute top-10 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-3xl" data-features-glow />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="sc-eyebrow">Product</p>
          <h2 id="features-title" className="sc-title-lg mt-5">
            Everything a serious practice loop needs.
          </h2>
          <p className="sc-copy mt-4">
            Six capabilities, one flow - configure, answer, review, improve. Each one is part of the shipped product,
            not a roadmap promise.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-feature-grid>
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                data-feature-card
                className="group rounded-2xl border border-showcase-line bg-showcase-2/70 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-white/25 hover:bg-showcase-2 hover:shadow-[0_24px_60px_-30px_rgb(139_92_246/0.55)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-showcase-line bg-showcase/80 text-showcase-violet transition-colors duration-300 group-hover:text-showcase-blue">
                  <Icon size={18} aria-hidden />
                </span>
                <h3 className="mt-5 text-[15px] font-semibold text-showcase-ink">{feature.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-showcase-dim">{feature.copy}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
