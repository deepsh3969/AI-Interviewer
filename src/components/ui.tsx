import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertTriangle, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'secondary'
        ? 'btn-secondary'
        : variant === 'danger'
          ? 'btn-danger'
          : 'btn-ghost';
  return (
    <button type="button" className={`${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = '', as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-dim">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-accent-2">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="faint mt-1">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input min-h-32 resize-y ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input ${props.className ?? ''}`} />;
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warn' | 'danger';
}) {
  const tones: Record<string, string> = {
    neutral: 'border-line bg-panel-2 text-ink-dim',
    accent: 'border-accent/40 bg-accent/15 text-accent-2',
    success: 'border-success/40 bg-success/15 text-success',
    warn: 'border-warn/40 bg-warn/15 text-warn',
    danger: 'border-danger/40 bg-danger/15 text-danger',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-dim">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden />
      {label}
    </span>
  );
}

export function Progress({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-xs text-ink-dim">
          <span>{label}</span>
          <span>
            {Math.round(value)}/{max}
          </span>
        </div>
      ) : null}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-panel-2"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? 'Progress'}
      >
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {hint ? <p className="faint mt-1">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-2" aria-hidden>
        ◎
      </div>
      <h2 className="text-lg font-medium text-ink">{title}</h2>
      <p className="max-w-md text-sm text-ink-dim">{description}</p>
      {action}
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 print:hidden">
      <button type="button" className="absolute inset-0 bg-overlay/45 backdrop-blur-[1px]" aria-label="Close dialog" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="card relative z-10 w-full max-w-lg animate-slide-up p-5 shadow-pop"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-ink-faint hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="text-sm text-ink-dim">{children}</div>
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-line print:hidden" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            active === tab.id
              ? 'border-accent text-ink'
              : 'border-transparent text-ink-dim hover:border-line-strong hover:text-ink'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** A single shimmering placeholder block. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/** Page-level skeleton used as the Suspense fallback for lazy-loaded routes. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page">
      <span className="sr-only">Loading…</span>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-3 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card space-y-3 p-5 lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-52 w-full" />
        </div>
        <div className="card space-y-3 p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  );
}

/** Error panel with an optional retry action. */
export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card border-danger/30 p-6" role="alert">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle size={16} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink-dim">{description}</p>
          {onRetry ? (
            <Button variant="secondary" className="mt-3" onClick={onRetry}>
              <RotateCcw size={14} aria-hidden />
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Square icon-only button with an accessible name and hover tooltip. */
export function IconButton({
  label,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-panel-2 hover:text-ink disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * KPI card for the dashboard: label, big value, optional hint, icon chip and
 * an optional trend chip. The trend only renders when real comparative data
 * exists (callers pass null otherwise - never fabricate a delta).
 */
export function MetricCard({
  label,
  value,
  hint,
  icon,
  delta,
  deltaSuffix = 'pts',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  /** null = not enough history to compare; omitted arrows by design. */
  delta?: number | null;
  deltaSuffix?: string;
}) {
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{value}</p>
          {hint ? <p className="mt-1 truncate text-xs text-ink-dim">{hint}</p> : null}
        </div>
        {icon ? (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-2"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
      {hasDelta ? (
        <p
          className={`mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            positive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
          }`}
        >
          {positive ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
          {positive ? '+' : ''}
          {delta} {deltaSuffix} vs previous 30 days
        </p>
      ) : null}
    </div>
  );
}
