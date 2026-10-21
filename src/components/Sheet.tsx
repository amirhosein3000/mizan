"use client";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { Portal } from "./Portal";

/** Bottom sheet: dimmed backdrop, drag-free, closes on backdrop tap / Escape. */
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <Portal>
      <div className="fade-in fixed inset-0 z-50 flex items-end bg-black/45" onClick={onClose}>
        <div
          className="sheet-up mx-auto flex max-h-[88dvh] w-full max-w-[480px] flex-col rounded-t-3xl bg-bg"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center gap-2 px-4 pb-2 pt-3">
            <h2 className="min-w-0 flex-1 text-[16px] font-extrabold">{title}</h2>
            <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted" aria-label="بستن">
              <X className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
          {footer && <div className="border-t border-line bg-surface px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}
