import { useLayoutEffect, useRef } from 'react';
import { ArrowUpRight, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { gsap, motionAllowed } from '../../lib/showcase/anim.js';
import { SampleBadge } from './mocks.js';

/**
 * SECTION 05 — Animated analytics showcase.
 * All numbers here are demonstration values and labelled "Sample data".
 * Real user metrics live in the signed-in dashboard; nothing on this page
 * claims customer outcomes or AI accuracy.
 */

const TREND_POINTS = [52, 58, 55, 64, 70, 74, 82];
const SKILLS = [
  { label: 'Relevance', value: 88 },
  { label: 'Clarity', value: 82 },
  { label: 'Structure', value: 74 },
  { label: 'Evidence', value: 66 },
];

const HISTORY = [
  { role: 'Frontend Engineer', type: 'mixed', score: 84, date: 'Session 1' },
  { role: 'Product Manager', type: 'behavioral', score: 76, date: 'Session 2' },
  { role: 'Data Analyst', type: 'technical', score: 69, date: 'Session 3' },
];

const METRICS = [
  { label: 'Interviews completed', value: 24, suffix: '', hint: 'sample total' },
  { label: 'Average score', value: 78, suffix: '', hint: 'sample · last 30 days' },
  { label: 'Practice streak', value: 12, suffix: 'd', hint: 'sample consecutive days' },
];

function buildTrendPath(): string {
  const width = 420;
  const height = 170;
  const pad = 12;
  const min = 40;
  const max = 95;
  return TREND_POINTS.map((value, index) => {
    const x = pad + (index * (width - pad * 2)) / (TREND_POINTS.length - 1);
    const y = height - pad - ((value - min) / (max - min)) * (height - pad * 2);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export default function AnalyticsSection() {
  const rootRef = useRef<HTMLElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const countRefs = useRef<(HTMLElement | null)[]>([]);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !motionAllowed()) return;

    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      // Chart line draws progressively once the section enters.
      if (pathRef.current) {
        gsap.fromTo(
          pathRef.current,
          { strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            duration: 1.6,
            ease: 'power2.inOut',
            scrollTrigger: { trigger: root, start: 'top 70%', once: true },
          },
        );
      }

      gsap.from('[data-chart-dot]', {
        autoAlpha: 0,
        scale: 0,
        duration: 0.4,
        stagger: 0.14,
        delay: 0.5,
        transformOrigin: 'center',
        clearProps: 'all',
        scrollTrigger: { trigger: root, start: 'top 70%', once: true },
      });

      // Skill bars animate from zero.
      gsap.fromTo(
        barRefs.current.filter((el): el is HTMLDivElement => el !== null),
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.12,
          transformOrigin: 'left center',
          scrollTrigger: { trigger: '[data-skill-list]', start: 'top 80%', once: true },
        },
      );

      // Metric count-ups.
      countRefs.current.forEach((el) => {
        if (!el) return;
        gsap.fromTo(
          el,
          { textContent: 0 },
          {
            textContent: Number(el.dataset.count ?? '0'),
            duration: 1.3,
            ease: 'power1.out',
            snap: { textContent: 1 },
            scrollTrigger: { trigger: root, start: 'top 65%', once: true },
          },
        );
      });

      // Cards reveal in sequence.
      gsap.from('[data-analytics-card]', {
        autoAlpha: 0,
        y: 30,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.1,
        clearProps: 'transform,opacity,visibility',
        scrollTrigger: { trigger: '[data-analytics-grid]', start: 'top 80%', once: true },
      });

      mm.add('(min-width: 1024px)', () => {
        gsap.to('[data-analytics-grid-bg]', {
          yPercent: 10,
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

  const trendPath = buildTrendPath();

  return (
    <section ref={rootRef} id="analytics" className="sc-section overflow-hidden" aria-labelledby="analytics-title">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="sc-grid-bg absolute inset-0" data-analytics-grid-bg />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="sc-eyebrow">Analytics</p>
            <h2 id="analytics-title" className="sc-title-lg mt-5">
              Watch preparation turn into progress.
            </h2>
            <p className="sc-copy mt-4">
              Score trends, skill breakdowns and history - rendered from session records, never extrapolated. The
              figures below illustrate the interface and are labelled sample data.
            </p>
          </div>
          <SampleBadge />
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3" data-analytics-grid>
          {/* Trend chart */}
          <figure className="sc-card p-6 lg:col-span-2" data-analytics-card>
            <figcaption className="flex items-center justify-between">
              <span className="text-sm font-semibold text-showcase-ink">Score trend</span>
              <span className="text-[11px] text-showcase-dim">sample · 7 sessions</span>
            </figcaption>
            <svg viewBox="0 0 420 170" className="mt-5 w-full" role="img" aria-label="Sample line chart showing practice scores rising from 52 to 82 across seven sessions">
              {[0, 1, 2, 3].map((i) => (
                <line
                  key={i}
                  x1="12"
                  x2="408"
                  y1={12 + i * 48.5}
                  y2={12 + i * 48.5}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
              ))}
              <path
                ref={pathRef}
                d={trendPath}
                fill="none"
                stroke="url(#trendGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1"
              />
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#5B8CFF" />
                </linearGradient>
              </defs>
              {TREND_POINTS.map((value, index) => {
                const x = 12 + (index * (420 - 24)) / (TREND_POINTS.length - 1);
                const y = 170 - 12 - ((value - 40) / 55) * (170 - 24);
                return (
                  <circle key={index} cx={x} cy={y} r="4" fill="#080B14" stroke="#5B8CFF" strokeWidth="2" data-chart-dot />
                );
              })}
            </svg>
            <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-showcase-dim/80" aria-hidden>
              {TREND_POINTS.map((_, i) => (
                <span key={i}>S{i + 1}</span>
              ))}
            </div>
          </figure>

          {/* Metric tiles */}
          <div className="grid gap-5">
            {METRICS.map((metric, index) => (
              <div key={metric.label} className="sc-card px-5 py-4" data-analytics-card>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-showcase-dim">{metric.label}</p>
                <p className="mt-1 flex items-baseline gap-1">
                  <span
                    className="text-3xl font-semibold text-showcase-ink"
                    data-count={metric.value}
                    ref={(el) => {
                      countRefs.current[index] = el;
                    }}
                  >
                    {metric.value}
                  </span>
                  <span className="text-sm font-medium text-showcase-dim">{metric.suffix}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-showcase-dim/80">{metric.hint}</p>
              </div>
            ))}
          </div>

          {/* Skill breakdown */}
          <div className="sc-card p-6" data-analytics-card data-skill-list>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-showcase-ink">Skill breakdown</h3>
              <span className="text-[11px] text-showcase-dim">sample</span>
            </div>
            <ul className="mt-5 space-y-4">
              {SKILLS.map((skill, index) => (
                <li key={skill.label}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-showcase-dim">{skill.label}</span>
                    <span className="font-mono text-showcase-ink/90">{skill.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      ref={(el) => {
                        barRefs.current[index] = el;
                      }}
                      className="h-full rounded-full bg-gradient-to-r from-showcase-violet to-showcase-blue"
                      style={{ width: `${skill.value}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* History preview */}
          <div className="sc-card p-6" data-analytics-card>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-showcase-ink">Interview history</h3>
              <span className="text-[11px] text-showcase-dim">sample</span>
            </div>
            <ul className="mt-4 divide-y divide-white/5">
              {HISTORY.map((row) => (
                <li key={row.role} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-showcase-ink">{row.role}</p>
                    <p className="text-[11px] text-showcase-dim">
                      {row.type} · {row.date}
                    </p>
                  </div>
                  <span className="rounded-md border border-showcase-line px-2 py-0.5 font-mono text-xs text-showcase-ink">
                    {row.score}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="sc-card p-6" data-analytics-card>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-showcase-ink">
                <Compass size={15} className="text-showcase-blue" aria-hidden /> Recommendations
              </h3>
              <span className="text-[11px] text-showcase-dim">sample</span>
            </div>
            <ul className="mt-4 space-y-3">
              <li className="rounded-xl border border-showcase-line bg-showcase/60 p-3.5">
                <p className="text-[13px] font-medium text-showcase-ink">Practice trade-off framing</p>
                <p className="mt-1 text-[11px] leading-relaxed text-showcase-dim">
                  Named trade-offs were missing in 4 of the last 5 sample answers.
                </p>
              </li>
              <li className="rounded-xl border border-showcase-line bg-showcase/60 p-3.5">
                <p className="text-[13px] font-medium text-showcase-ink">Run a hard-difficulty mock</p>
                <p className="mt-1 text-[11px] leading-relaxed text-showcase-dim">
                  Scores hold steady at medium - raise the bar for your target role.
                </p>
              </li>
            </ul>
            <Link
              to="/analytics"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-showcase-blue transition-colors hover:text-showcase-ink"
            >
              Open the analytics page <ArrowUpRight size={14} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
