"use client";
import { useEffect, useState } from "react";

interface Health {
  llm: "mock" | "live";
  priceProvider: "mock" | "torob";
}

let cache: Promise<Health | null> | null = null;
function loadHealth() {
  cache ??= fetch("/api/health")
    .then((r) => (r.ok ? (r.json() as Promise<Health>) : null))
    .catch(() => null);
  return cache;
}

/** Small «داده‌ی نمایشی» chip so nobody mistakes mock prices for real ones. */
export function ModeBadge() {
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => {
    loadHealth().then(setHealth);
  }, []);
  if (!health || health.priceProvider !== "mock") return null;
  return (
    <span
      title={health.llm === "mock" ? "قیمت‌ها و پاسخ‌ها نمایشی‌اند" : "قیمت‌ها نمایشی‌اند"}
      className="shrink-0 rounded-full border border-dashed border-fair/60 bg-fair-soft px-2 py-0.5 text-[10px] font-bold text-fair"
    >
      داده‌ی نمایشی
    </span>
  );
}
