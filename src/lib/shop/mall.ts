// "One building, many shops": group ranked shops by passage / mall and order them
// by floor, so the shopper can compare several shops in a single trip. Pure.
import { toEnDigits } from "../format";
import type { RankedShop } from "./rank";

const ORDINALS: Record<string, number> = {
  اول: 1, دوم: 2, سوم: 3, چهارم: 4, پنجم: 5, ششم: 6, هفتم: 7, هشتم: 8, نهم: 9, دهم: 10,
};

/** Sortable level for a parsed floor label; null when unknown. «همکف» = 0, «زیرهمکف» = -1. */
export function floorLevel(floor: string | null): number | null {
  if (!floor) return null;
  const f = toEnDigits(floor).replace(/\s+/g, "").replace(/[٠-٩]/g, "");
  if (f === "همکف") return 0;
  if (f === "زیرهمکف" || f === "زیرزمین") return -1;
  const neg = f.match(/^منفی(\d+)$/);
  if (neg) return -Number(neg[1]);
  if (/^\d+$/.test(f)) {
    const n = Number(f);
    return n > 30 ? null : n;
  }
  return ORDINALS[f] ?? null;
}

export function floorName(level: number): string {
  if (level === 0) return "همکف";
  if (level === -1) return "زیرهمکف";
  if (level < 0) return `منفی ${toFa(-level)}`;
  return `طبقه ${toFa(level)}`;
}

const toFa = (n: number) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/**
 * Same building, different spellings: «پاساژ علاالدین» / «پاساژ علاءالدین» / «پاساژ علائدین» /
 * «مجتمع تجاری علاالدین تهران», «چهارسو» / «چارسو», «علاالدین۳» / «علاالدین ۳».
 */
export function mallKey(mall: string): string {
  return toEnDigits(mall)
    .replace(/^(پاساژ|مجتمع تجاری|مجتمع|مرکز خرید|بازار)\s+/, "")
    .replace(/\s+تهران$/, "")
    .replace(/علا\S*دین/g, "علاالدین")
    .replace(/چهارسو/g, "چارسو")
    .replace(/[ءئأ]/g, "")
    .replace(/\s+/g, "");
}

export interface MallFloor {
  level: number | null;
  label: string;
  shops: RankedShop[];
}

export interface MallGroup {
  name: string;
  shops: RankedShop[];
  /** Top floor first (like looking at the building); unknown floor last. */
  floors: MallFloor[];
  minPrice: number | null;
  maxPrice: number | null;
  open: number;
}

/**
 * Malls holding at least `min` of the given shops, biggest first. `priceFloor` (the product's
 * trimmed minimum) keeps listed outliers out of the passage's price range.
 */
export function mallGroups(shops: RankedShop[], min = 3, priceFloor?: number | null): MallGroup[] {
  const byMall = new Map<string, { name: string; shops: RankedShop[]; names: Map<string, number> }>();
  for (const s of shops) {
    if (!s.shop.mall) continue;
    const key = mallKey(s.shop.mall);
    const g = byMall.get(key) ?? { name: s.shop.mall, shops: [], names: new Map<string, number>() };
    g.shops.push(s);
    g.names.set(s.shop.mall, (g.names.get(s.shop.mall) ?? 0) + 1);
    byMall.set(key, g);
  }
  return [...byMall.values()]
    .filter((g) => g.shops.length >= min)
    .map((g) => {
      const floors = new Map<string, MallFloor>();
      for (const s of g.shops) {
        const level = floorLevel(s.shop.floor);
        const k = level === null ? "?" : String(level);
        const f = floors.get(k) ?? { level, label: level === null ? "طبقه نامعلوم" : floorName(level), shops: [] };
        f.shops.push(s);
        floors.set(k, f);
      }
      for (const f of floors.values()) f.shops.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      const prices = g.shops
        .filter((s) => !priceFloor || s.priceSource === "confirmed" || (s.price ?? 0) >= priceFloor * 0.85)
        .map((s) => s.price)
        .filter((p): p is number => !!p);
      return {
        name: [...g.names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? g.name,
        shops: g.shops,
        floors: [...floors.values()].sort((a, b) => (b.level ?? -99) - (a.level ?? -99)),
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
        open: g.shops.filter((s) => s.status.state === "open").length,
      };
    })
    .sort((a, b) => b.shops.length - a.shops.length);
}
