"use client";
import { useState, type ComponentProps } from "react";
import { formatNumber, parsePrice, toFaDigits } from "@/lib/format";

/** Regroup a plain number as it's typed; keep words like «میلیون» untouched. */
export function regroupTypedPrice(text: string): string {
  if (/^[\d۰-۹٠-٩,٬\s]*$/.test(text)) {
    const n = parsePrice(text);
    return n ? formatNumber(n) : toFaDigits(text.replace(/[^\d۰-۹٠-٩]/g, ""));
  }
  return text;
}

/**
 * Compact Toman input with live Persian grouping. Calls onCommit with the parsed
 * value on Enter or blur (null when cleared).
 */
export function PriceField({
  value,
  onCommit,
  className = "",
  placeholder = "قیمت",
  ...rest
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
} & Omit<ComponentProps<"input">, "value" | "onChange">) {
  const [raw, setRaw] = useState(value ? formatNumber(value) : "");
  const commit = () => {
    const v = parsePrice(raw);
    if (v !== value) onCommit(v);
  };
  return (
    <input
      value={raw}
      onChange={(e) => setRaw(regroupTypedPrice(e.target.value))}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      inputMode="numeric"
      placeholder={placeholder}
      className={`tabular rounded-xl border border-line bg-surface px-3 text-[14px] font-bold outline-none focus:border-brand ${className}`}
      {...rest}
    />
  );
}
