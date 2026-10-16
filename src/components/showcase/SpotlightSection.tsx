import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { gsap, motionAllowed } from '../../lib/showcase/anim.js';
import { SampleBadge } from './mocks.js';

/**
 * SECTION 04 — Sticky feature spotlight.
 * Desktop: pinned visual panel on the left, three scrolling statements on
 * the right. Active state comes from IntersectionObserver (works with or
 * without reduced motion); panel scenes crossfade with CSS transitions.
 * Mobile: each statement renders its own inline visual - no sticky panel.
 */

const BLOCKS = [
  {
    id: 'spotlight-performance',
    title: 'Understand your performance.',
    copy: 'Every finished session produces a report: overall practice score, per-question grades and dimension breakdowns with concrete evidence - so "how did I do?" gets a specific answer, not a vibe.',
    points: ['Score per answer and overall', 'Dimensions with evidence', 'Printable report per session'],
  },
  {
    id: 'spotlight-weak-spots',
    title: 'Find your weak spots.',
    copy: 'Recurring weaknesses are aggregated across sessions and ranked by how often they cost you points - the fastest way to see which habits to break first.',
    points: ['Recurring weakness ranking', 'Skill trends over time', 'Recommendations from your history'],
  },
  {
    id: 'spotlight-answer',
    title: 'Build a better answer.',
    copy: 'Each question carries an answer structure and evaluation criteria. Use them as a rehearsal script: draft, review the outline, and run it again until the shape is automatic.',
    points: ['Suggested answer structures', 'Criteria you are scored on', 'Model outlines after review'],
  },
];

function PerformanceScene() {
  return (
    <div className="sc-card flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-showcase-line px-4 py-3">
        <span className="text-xs font-semibold text-showcase-ink">Session report</span>
        <SampleBadge />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4 px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Score', value: '78' },
            { label: 'Best answer', value: '91' },
            { label: 'Questions', value: '5/5' },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-showcase-line bg-showcase/60 px-3 py-3 text-center">
              <p className="text-xl font-semibold text-showcase-ink">{m.value}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-showcase-dim">{m.label}</p>
            </div>
          ))}
        </div>
        <ul className="space-y-3">
          {[
            { label: 'Relevance', value: 86 },
            { label: 'Structure', value: 74 },
            { label: 'Evidence', value: 65 },
          ].map((d) => (
            <li key={d.label}>
              <div className="mb-1 flex justify-between text-[11px]">
                <span className="text-showcase-dim">{d.label}</span>
                <span className="font-mono text-showcase-ink/90">{d.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-showcase-violet to-showcase-blue"
                  style={{ width: `${d.value}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function WeakSpotsScene() {
  return (
    <div className="sc-card flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-showcase-line px-4 py-3">
        <span className="text-xs font-semibold text-showcase-ink">Recurring weaknesses</span>
        <SampleBadge />
      </div>
      <ul className="flex flex-1 flex-col justify-center divide-y divide-white/5 px-4">
        {[
          { label: 'Trade-offs left unnamed', hits: '4 of last 5 sessions' },
          { label: 'Missing measurable results', hits: '3 of last 5 sessions' },
          { label: 'Answers run over 2 minutes', hits: '2 of last 5 sessions' },
        ].map((w) => (
          <li key={w.label} className="flex items-center justify-between gap-3 py-3.5">
            <div>
              <p className="text-[13px] font-medium text-showcase-ink">{w.label}</p>
              <p className="mt-0.5 text-[11px] text-showcase-dim">{w.hits}</p>
            </div>
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400/80" aria-hidden />
          </li>
        ))}
      </ul>
      <div className="shrink-0 border-t border-showcase-line px-4 py-3">
        <p className="text-[11px] leading-relaxed text-showcase-dim">
          Ranked by how often the weakness lowered a score. Fix the top one first.
        </p>
      </div>
    </div>
  );
}

function AnswerBuilderScene() {
  return (
    <div className="sc-card flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-showcase-line px-4 py-3">
        <span className="text-xs font-semibold text-showcase-ink">Answer structure</span>
        <SampleBadge />
      </div>
      <ol className="flex flex-1 flex-col justify-center px-4 py-2">
        {[
          { step: 'Context', note: 'Set the scene in one sentence', done: true },
          { step: 'Action', note: 'What you decided and did', done: true },
          { step: 'Result', note: 'Numbers, outcome, trade-off', done: false },
          { step: 'Reflection', note: 'What you would change', done: false },
        ].map((s) => (
          <li key={s.step} className="flex gap-3 border-b border-white/5 py-3 last:border-0">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                s.done ? 'bg-showcase-violet/25 text-showcase-violet' : 'border border-showcase-line text-showcase-dim'
              }`}
              aria-hidden
            >
              {s.done ? '✓' : '•'}
            </span>
            <div>
              <p className="text-[13px] font-semibold text-showcase-ink">{s.step}</p>
              <p className="text-[11px] text-showcase-dim">{s.note}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const SCENES: ReactNode[] = [<PerformanceScene key="perf" />, <WeakSpotsScene key="weak" />, <AnswerBuilderScene key="answer" />];

export default function SpotlightSection() {
  const rootRef = useRef<HTMLElement>(null);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // Active statement drives the sticky panel (observer works regardless of
  // reduced-motion settings; CSS transitions handle the crossfade).
  useEffect(() => {
    const blocks = blockRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (blocks.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = blocks.indexOf(entry.target as HTMLDivElement);
          if (index >= 0) setActive(index);
        }
      },
      { rootMargin: '-40% 0px -45% 0px', threshold: 0 },
    );
    blocks.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !motionAllowed()) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-spotlight-head]', {
        autoAlpha: 0,
        y: 28,
        duration: 0.7,
        ease: 'power2.out',
        clearProps: 'all',
        scrollTrigger: { trigger: root, start: 'top 75%', once: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  function goToBlock(index: number) {
    blockRefs.current[index]?.scrollIntoView({
      behavior: motionAllowed() ? 'smooth' : 'auto',
      block: 'center',
    });
  }

  return (
    <section ref={rootRef} id="spotlight" className="sc-section" aria-labelledby="spotlight-title">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl" data-spotlight-head>
          <p className="sc-eyebrow">Spotlight</p>
          <h2 id="spotlight-title" className="sc-title-lg mt-5">
            From raw answers to a clear read on your performance.
          </h2>
        </div>

        <div className="mt-14 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          {/* Sticky visual (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <div className="relative h-[430px]">
                {SCENES.map((scene, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-500 ${
                      active === index ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
                    }`}
                    aria-hidden={active !== index}
                  >
                    {scene}
                  </div>
                ))}
              </div>
              {/* Progress markers */}
              <div className="mt-5 flex items-center gap-2" aria-hidden>
                {BLOCKS.map((block, index) => (
                  <button
                    key={block.id}
                    type="button"
                    tabIndex={-1}
                    onClick={() => goToBlock(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      active === index
                        ? 'w-10 bg-gradient-to-r from-showcase-violet to-showcase-blue'
                        : 'w-6 bg-white/15 hover:bg-white/30'
                    }`}
                    aria-label={`Show visual for "${block.title}"`}
                  />
                ))}
                <span className="ml-auto text-[11px] text-showcase-dim">
                  {active + 1} / {BLOCKS.length}
                </span>
              </div>
            </div>
          </div>

          {/* Scrolling statements */}
          <div>
            {BLOCKS.map((block, index) => (
              <div
                key={block.id}
                id={block.id}
                ref={(el) => {
                  blockRefs.current[index] = el;
                }}
                className="flex min-h-[52vh] scroll-mt-24 flex-col justify-center py-10 lg:min-h-[68vh]"
                data-spotlight-block
              >
                {/* Inline visual for mobile */}
                <div className="mb-6 lg:hidden">{SCENES[index]}</div>

                <div
                  className={`border-l-2 pl-5 transition-colors duration-300 ${
                    active === index ? 'border-showcase-violet' : 'border-white/10'
                  }`}
                >
                  <h3
                    className={`text-2xl font-semibold tracking-tight transition-colors duration-300 sm:text-3xl ${
                      active === index ? 'text-showcase-ink' : 'text-showcase-ink/65'
                    }`}
                  >
                    {block.title}
                  </h3>
                  <p className="sc-copy mt-4 max-w-lg">{block.copy}</p>
                  <ul className="mt-5 space-y-2.5">
                    {block.points.map((point) => (
                      <li key={point} className="flex items-center gap-2.5 text-sm text-showcase-dim">
                        <span className="h-1.5 w-1.5 rounded-full bg-showcase-blue" aria-hidden />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
