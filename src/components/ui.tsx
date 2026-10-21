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
