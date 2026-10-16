import { Check, Clock3, MessageSquareText, Mic2, Sparkles, Target, TrendingUp } from 'lucide-react';

/**
 * Presentational product mockups used by the showcase sections.
 * They mirror real screens of the app (question flow, report, plan).
 * Every numeric display here is demonstration content and is labelled
 * "Sample data" in the surrounding section copy.
 */

export function SampleBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-showcase-line bg-showcase/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-showcase-dim ${className}`}
    >
      Sample data
    </span>
  );
}

export function QuestionMock() {
  return (
    <div className="sc-card w-full max-w-xl overflow-hidden shadow-[0_24px_80px_-32px_rgb(139_92_246/0.45)]">
      <div className="flex items-center justify-between border-b border-showcase-line px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-medium text-showcase-dim">
          <MessageSquareText size={14} aria-hidden className="text-showcase-violet" />
          Behavioral · Question 2 of 5
        </span>
        <span className="flex items-center gap-1.5 rounded-md border border-showcase-line px-2 py-0.5 font-mono text-[11px] text-showcase-dim">
          <Clock3 size={11} aria-hidden />
          01:24
        </span>
      </div>
      <div className="px-4 py-4">
        <p className="text-[15px] font-medium leading-relaxed text-showcase-ink">
          Tell me about a time you had to deliver under a tight deadline. What did you prioritize, and what was the
          outcome?
        </p>
        <div className="mt-4 rounded-xl border border-showcase-line bg-showcase/70 p-3" data-scene-focus>
          <p className="text-[13px] leading-relaxed text-showcase-dim">
            In my last role we had two weeks to ship a migration that normally takes a quarter. I split the work into
            <span className="mx-1 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-showcase-violet align-middle" data-caret />
            ...
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-showcase-dim">
            <Mic2 size={12} aria-hidden /> Voice or typed answers
          </span>
          <span className="rounded-lg bg-gradient-to-r from-showcase-violet to-showcase-blue px-3 py-1.5 text-[12px] font-semibold text-white">
            Submit answer
          </span>
        </div>
      </div>
    </div>
  );
}

const DIMENSIONS = [
  { label: 'Relevance', value: 86 },
  { label: 'Structure', value: 74 },
  { label: 'Specificity', value: 68 },
  { label: 'Communication', value: 81 },
];

export function FeedbackMock() {
  const score = 78;
  const circumference = 2 * Math.PI * 34;
  const filled = (score / 100) * circumference;
  return (
    <div className="sc-card w-full max-w-xl overflow-hidden shadow-[0_24px_80px_-32px_rgb(91_140_255/0.4)]">
      <div className="flex items-center justify-between border-b border-showcase-line px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-medium text-showcase-dim">
          <Sparkles size={14} aria-hidden className="text-showcase-blue" />
          Answer feedback
        </span>
        <SampleBadge />
      </div>
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex items-center gap-3 sm:block">
          <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" aria-hidden>
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="url(#fbGrad)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference - filled}`}
            />
            <defs>
              <linearGradient id="fbGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#5B8CFF" />
              </linearGradient>
            </defs>
          </svg>
          <div className="sm:mt-2">
            <p className="text-2xl font-semibold text-showcase-ink" data-count="78">
              78
            </p>
            <p className="text-[11px] text-showcase-dim">Overall practice score</p>
          </div>
        </div>
        <ul className="space-y-2.5">
          {DIMENSIONS.map((d) => (
            <li key={d.label}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-showcase-dim">{d.label}</span>
                <span className="font-mono text-showcase-ink/90">{d.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-showcase-violet to-showcase-blue"
                  style={{ width: `${d.value}%` }}
                  data-bar
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-2 border-t border-showcase-line px-4 py-3 sm:grid-cols-2">
        <p className="rounded-lg bg-showcase/70 px-3 py-2 text-[12px] leading-snug text-showcase-dim">
          <span className="font-semibold text-emerald-300">Strength:</span> clear ownership and a measurable result.
        </p>
        <p className="rounded-lg bg-showcase/70 px-3 py-2 text-[12px] leading-snug text-showcase-dim">
          <span className="font-semibold text-amber-300">Fix:</span> name the trade-off you rejected and why.
        </p>
      </div>
    </div>
  );
}

const PLAN_ITEMS = [
  { text: 'Practice the STAR structure on 3 behavioral questions', done: true },
  { text: 'Add one metric to every project story', done: true },
  { text: 'Run a hard-difficulty mock for your target role', done: false },
];

export function PlanMock() {
  return (
    <div className="sc-card w-full max-w-xl overflow-hidden shadow-[0_24px_80px_-32px_rgb(139_92_246/0.4)]">
      <div className="flex items-center justify-between border-b border-showcase-line px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-medium text-showcase-dim">
          <Target size={14} aria-hidden className="text-showcase-violet" />
          Your improvement plan
        </span>
        <SampleBadge />
      </div>
      <ul className="space-y-2.5 px-4 py-4">
        {PLAN_ITEMS.map((item) => (
          <li
            key={item.text}
            className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-[13px] leading-snug transition-colors ${
              item.done
                ? 'border-emerald-400/25 bg-emerald-400/8 text-showcase-dim'
                : 'border-showcase-line bg-showcase/70 text-showcase-ink'
            }`}
            data-plan-item
          >
            <span
              className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${
                item.done ? 'bg-emerald-400/20 text-emerald-300' : 'border border-showcase-line text-showcase-dim'
              }`}
              style={{ width: 18, height: 18 }}
              aria-hidden
            >
              {item.done ? <Check size={11} strokeWidth={3} /> : <span className="text-[10px]">•</span>}
            </span>
            {item.text}
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t border-showcase-line px-4 py-3">
        <p className="flex items-center gap-2 text-[12px] text-showcase-dim">
          <TrendingUp size={13} aria-hidden className="text-showcase-blue" />
          Recommended next: mixed interview, medium
        </p>
        <span className="rounded-lg border border-showcase-line px-3 py-1.5 text-[12px] font-semibold text-showcase-ink">
          Start next
        </span>
      </div>
    </div>
  );
}

/** Decorative "digital workspace" composition for the hero. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md pb-16 lg:max-w-lg" aria-hidden>
      <div className="sc-glow-violet absolute -inset-10 rounded-full blur-2xl" data-hero-glow />
      <div className="sc-card relative rotate-[-1.5deg] p-4 shadow-[0_32px_90px_-40px_rgb(139_92_246/0.6)] sc-float">
        <div className="flex items-center justify-between text-[11px] text-showcase-dim">
          <span className="rounded-md border border-showcase-line px-2 py-0.5 font-mono">mock · live</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            session in progress
          </span>
        </div>
        <p className="mt-3 text-[15px] font-medium leading-relaxed text-showcase-ink">
          How would you design a rate limiter for a public API with 10k requests per second?
        </p>
        <div className="mt-3 space-y-2" data-hero-lines>
          <div className="h-2 w-11/12 rounded bg-white/10" />
          <div className="h-2 w-9/12 rounded bg-white/8" />
          <div className="h-2 w-10/12 rounded bg-white/6" />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-showcase-line pt-3">
          <span className="flex items-center gap-1.5 text-[11px] text-showcase-dim">
            <Mic2 size={12} /> listening…
          </span>
          <span className="rounded-md bg-gradient-to-r from-showcase-violet to-showcase-blue px-2.5 py-1 text-[11px] font-semibold text-white">
            Get feedback
          </span>
        </div>
      </div>
      <div className="sc-card absolute -right-3 -bottom-6 w-44 rotate-2 p-3 shadow-xl sm:-right-6" data-hero-chip>
        <p className="text-[10px] uppercase tracking-wider text-showcase-dim">Practice score</p>
        <p className="text-xl font-semibold text-showcase-ink">
          78 <span className="text-xs font-medium text-emerald-300">+6</span>
        </p>
        <p className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
          <span className="block h-full w-[78%] rounded-full bg-gradient-to-r from-showcase-violet to-showcase-blue" />
        </p>
      </div>
    </div>
  );
}
