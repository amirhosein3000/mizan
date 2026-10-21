// The shopper's situation: where they start from, how far they'll go, when they
// will visit and which purchase conditions matter. Lives in the URL/localStorage
// on the client and is sent to the API as query params. Pure.
import type { LatLon } from "./geo";

export interface Origin extends LatLon {
  label: string;
  source: "gps" | "area" | "landmark" | "map";
}

export interface ShopperContext {
  origin: Origin | null;
  /** Max distance in km from origin; null = anywhere in Tehran. */
  radiusKm: number | null;
  /** Planned visit time (epoch ms); null = now. */
  visitAt: number | null;
  installment: boolean;
  torobPayInPerson: boolean;
  openOnly: boolean;
  warranty: boolean;
  fastDelivery: boolean;
  budgetMax: number | null;
}

export const DEFAULT_CONTEXT: ShopperContext = {
  origin: null,
  radiusKm: null,
  visitAt: null,
  installment: false,
  torobPayInPerson: false,
  openOnly: false,
  warranty: false,
  fastDelivery: false,
  budgetMax: null,
};

const b = (v: boolean) => (v ? "1" : undefined);

/** Context -> compact query params (only non-defaults). */
export function contextToParams(ctx: ShopperContext): Record<string, string> {
  const p: Record<string, string | undefined> = {
    lat: ctx.origin ? ctx.origin.lat.toFixed(5) : undefined,
    lon: ctx.origin ? ctx.origin.lon.toFixed(5) : undefined,
    ol: ctx.origin?.label,
    os: ctx.origin?.source,
    r: ctx.radiusKm ? String(ctx.radiusKm) : undefined,
    at: ctx.visitAt ? String(ctx.visitAt) : undefined,
    inst: b(ctx.installment),
    tp: b(ctx.torobPayInPerson),
    open: b(ctx.openOnly),
    war: b(ctx.warranty),
    fast: b(ctx.fastDelivery),
    max: ctx.budgetMax ? String(ctx.budgetMax) : undefined,
  };
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as Record<string, string>;
}

export function contextFromParams(get: (k: string) => string | null): ShopperContext {
  const num = (k: string) => {
    const v = Number(get(k));
    return Number.isFinite(v) && v !== 0 ? v : null;
  };
  const lat = num("lat");
  const lon = num("lon");
  const src = get("os");
  return {
    origin:
      lat && lon
        ? {
            lat,
            lon,
            label: get("ol") || "موقعیت انتخابی",
            source: src === "gps" || src === "area" || src === "landmark" || src === "map" ? src : "map",
          }
        : null,
    radiusKm: num("r"),
    visitAt: num("at"),
    installment: get("inst") === "1",
    torobPayInPerson: get("tp") === "1",
    openOnly: get("open") === "1",
    warranty: get("war") === "1",
    fastDelivery: get("fast") === "1",
    budgetMax: num("max"),
  };
}

export function activeFilterCount(ctx: ShopperContext): number {
  return [ctx.radiusKm, ctx.installment, ctx.torobPayInPerson, ctx.openOnly, ctx.warranty, ctx.fastDelivery, ctx.budgetMax].filter(Boolean)
    .length;
}

/** Coerce an untrusted (client-sent) context into a valid one; unknown fields are dropped. */
export function sanitizeContext(raw: unknown): ShopperContext {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null);
  const o = (r.origin && typeof r.origin === "object" ? r.origin : null) as Record<string, unknown> | null;
  const lat = num(o?.lat, 34, 37);
  const lon = num(o?.lon, 50, 53);
  const src = o?.source;
  return {
    origin:
      lat !== null && lon !== null
        ? {
            lat,
            lon,
            label: typeof o?.label === "string" ? o.label.slice(0, 60) : "موقعیت انتخابی",
            source: src === "gps" || src === "area" || src === "landmark" || src === "map" ? src : "map",
          }
        : null,
    radiusKm: num(r.radiusKm, 0.1, 100),
    visitAt: num(r.visitAt, 0, Number.MAX_SAFE_INTEGER),
    installment: r.installment === true,
    torobPayInPerson: r.torobPayInPerson === true,
    openOnly: r.openOnly === true,
    warranty: r.warranty === true,
    fastDelivery: r.fastDelivery === true,
    budgetMax: num(r.budgetMax, 1, 1e12),
  };
}
