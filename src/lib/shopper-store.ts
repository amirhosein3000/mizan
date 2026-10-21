"use client";
// The shopper's context (origin, radius, visit time, purchase conditions), kept in
// localStorage and shared by every screen through useSyncExternalStore — so a
// filter set on one screen holds everywhere, and survives a reload.
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { contextToParams, DEFAULT_CONTEXT, type ShopperContext } from "./shop/context";

const KEY = "mizan.ctx.v1";
const listeners = new Set<() => void>();
let cacheRaw: string | null | undefined;
let cacheValue: ShopperContext = DEFAULT_CONTEXT;

function read(): ShopperContext {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      const parsed = raw ? (JSON.parse(raw) as Partial<ShopperContext>) : {};
      cacheValue = { ...DEFAULT_CONTEXT, ...parsed };
      // A planned visit in the past means "now".
      if (cacheValue.visitAt && cacheValue.visitAt < Date.now() - 30 * 60_000) cacheValue = { ...cacheValue, visitAt: null };
    } catch {
      cacheValue = DEFAULT_CONTEXT;
    }
  }
  return cacheValue;
}

function write(next: ShopperContext) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: keep it in memory */
  }
  cacheRaw = JSON.stringify(next);
  cacheValue = next;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useShopper() {
  const ctx = useSyncExternalStore(subscribe, read, () => DEFAULT_CONTEXT);
  const patch = useCallback((p: Partial<ShopperContext>) => write({ ...read(), ...p }), []);
  const reset = useCallback(() => write({ ...DEFAULT_CONTEXT, origin: read().origin }), []);
  /** Query string for API calls, e.g. "lat=..&lon=..&inst=1". */
  const query = useMemo(() => new URLSearchParams(contextToParams(ctx)).toString(), [ctx]);
  return { ctx, patch, reset, query };
}

/** Append the shopper context to an API path. */
export function withCtx(path: string, query: string): string {
  if (!query) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}
