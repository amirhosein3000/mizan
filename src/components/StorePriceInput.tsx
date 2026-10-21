"use client";
import { useState } from "react";
import { Store } from "lucide-react";
import { formatNumber, parsePrice, toFaDigits } from "@/lib/format";
import { Button } from "./ui";

/** Store-price entry: accepts Persian/Latin digits and «۳۵ میلیون», shows live grouping. */
export function StorePriceInput({
  initial,
  onSubmit,
  busy,
}: {
  initial?: number | null;
  onSubmit: (price: number) => void;
  busy?: boolean;
}) {
  const [raw, setRaw] = useState(initial ? formatNumber(initial) : "");
  const value = parsePrice(raw);

  function onChange(text: string) {
    // Keep words like «میلیون» as typed; regroup plain numbers as the user types.
    if (/^[\d۰-۹٠-٩,٬\s]*$/.test(text)) {
      const n = parsePrice(text);
      setRaw(n ? formatNumber(n) : toFaDigits(text.replace(/[^\d۰-۹٠-٩]/g, "")));
    } else {
      setRaw(text);
    }
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (value) onSubmit(value);
      }}
    >
      <label className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface px-4 focus-within:border-brand">
        <Store className="size-5 shrink-0 text-muted" />
        <input
          value={raw}
          onChange={(e) => onChange(e.target.value)}
          inputMode="numeric"
          enterKeyHint="go"
          placeholder="قیمت مغازه، مثلاً ۳۴٬۵۰۰٬۰۰۰"
          className="tabular h-14 min-w-0 flex-1 bg-transparent text-[18px] font-bold outline-none placeholder:text-[15px] placeholder:font-normal placeholder:text-muted/70"
          aria-label="قیمت مغازه به تومان"
        />
        <span className="shrink-0 text-sm text-muted">تومان</span>
      </label>
      <Button type="submit" disabled={!value || busy}>
        {initial ? "دوباره بسنج" : "این قیمت خوبه؟"}
      </Button>
    </form>
  );
}
