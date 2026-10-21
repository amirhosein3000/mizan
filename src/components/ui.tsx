// Small UI primitives. Keep styling here so every screen looks consistent.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white shadow-[0_6px_16px_-6px_rgba(91,71,224,0.6)] active:bg-brand-ink",
  secondary: "bg-surface text-ink border border-line active:bg-surface-2",
  ghost: "bg-transparent text-brand active:bg-brand-soft",
  danger: "bg-high-soft text-high active:opacity-80",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-2xl px-4 h-12 text-[15px] font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-[var(--radius-card)] bg-surface p-4 shadow-[0_1px_2px_rgba(20,10,60,0.06)] ${className}`} {...props} />;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="text-[15px] font-extrabold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-line/70 ${className}`} />;
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block size-5 animate-spin rounded-full border-[2.5px] border-current border-t-transparent ${className}`}
      aria-label="در حال بارگذاری"
    />
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-high-soft px-4 py-3 text-sm text-high">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 font-bold underline underline-offset-4">
          دوباره
        </button>
      )}
    </div>
  );
}

export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted ${className}`}>
      {children}
    </span>
  );
}

export type Tone = "good" | "fair" | "high" | "info" | "brand" | "muted";

const TONES: Record<Tone, string> = {
  good: "bg-good-soft text-good",
  fair: "bg-fair-soft text-fair",
  high: "bg-high-soft text-high",
  info: "bg-info-soft text-info",
  brand: "bg-brand-soft text-brand",
  muted: "bg-surface-2 text-muted",
};

/** Small status label. */
export function Pill({ tone = "muted", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold leading-5 ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** Toggle chip for filters: outlined when off, filled when on. */
export function FilterChip({
  on,
  onClick,
  children,
  className = "",
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition-colors ${
        on ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink active:bg-surface-2"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Horizontal tab switch. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = "",
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1 ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 shrink-0 grow rounded-xl px-3 text-[13px] font-bold transition-colors ${
            value === o.value ? "bg-surface text-ink shadow-[0_1px_3px_rgba(20,10,60,0.12)]" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] bg-surface px-6 py-8 text-center">
      {icon && <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">{icon}</span>}
      <div className="text-[15px] font-extrabold">{title}</div>
      {children && <div className="text-[13px] leading-6 text-muted">{children}</div>}
    </div>
  );
}
