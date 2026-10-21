// Free text -> FTS5 MATCH expression, with Persian/Latin brand synonyms. Pure.
import { normalizeText } from "../text";

/** Persian <-> Latin spellings people mix freely («سامسونگ a56», "iphone ۱۳"). */
const SYNONYMS: string[][] = [
  ["samsung", "سامسونگ", "galaxy", "گلکسی"],
  ["apple", "اپل", "iphone", "ایفون", "آیفون"],
  ["xiaomi", "شیائومی", "شیامی", "redmi", "ردمی", "poco", "پوکو"],
  ["huawei", "هواوی", "هوآوی"],
  ["honor", "انر", "آنر"],
  ["nokia", "نوکیا"],
  ["sony", "سونی"],
  ["lg", "الجی", "ال جی"],
  ["asus", "ایسوس"],
  ["lenovo", "لنوو"],
  ["hp", "اچ پی", "اچپی"],
  ["dell", "دل"],
  ["acer", "ایسر"],
  ["anker", "انکر"],
  ["philips", "فیلیپس"],
  ["bosch", "بوش"],
  ["dahua", "داهوا"],
  ["hikvision", "هایک ویژن", "هایکویژن"],
  ["canon", "کانن"],
  ["nikon", "نیکون"],
  ["jbl", "جی بی ال"],
  ["casio", "کاسیو"],
  ["tecno", "تکنو"],
  ["realme", "ریلمی"],
  ["motorola", "موتورولا"],
  ["airpods", "ایرپاد", "ایرپادز"],
  ["laptop", "لپتاپ", "لپ تاپ"],
  ["headphone", "هدفون", "هندزفری", "هدست"],
  ["charger", "شارژر"],
  ["cctv", "مداربسته", "مدار بسته"],
];

const SYN_INDEX = new Map<string, string[]>();
for (const group of SYNONYMS) {
  const norm = group.map((g) => normalizeText(g)).filter((g) => !g.includes(" "));
  for (const g of norm) SYN_INDEX.set(g, norm);
}

/** Words that never narrow a product search. */
const NOISE = new Set([
  "یه", "یک", "میخوام", "می", "خوام", "میخواستم", "دنبال", "برام", "برای", "پیدا", "کن", "کنید", "کجا", "بخرم",
  "خرید", "قیمت", "چنده", "چند", "داره", "دارن", "دارید", "و", "با", "از", "که", "رو", "را", "هست", "هستش", "لطفا",
  "مدل", "اصل", "نو", "جدید", "خوب", "ارزون", "ارزان",
]);

export function queryTokens(query: string): string[] {
  return normalizeText(query)
    .split(" ")
    .filter((t) => t && !NOISE.has(t))
    .slice(0, 8);
}

function quote(t: string): string {
  return `"${t.replace(/"/g, "")}"`;
}

function term(t: string): string {
  // Prefix match helps partial words («سامسو», "a5"), but very short tokens would explode.
  const one = (x: string) => (x.length >= 2 ? `${quote(x)}*` : quote(x));
  const syn = SYN_INDEX.get(t);
  return syn && syn.length > 1 ? `(${syn.map(one).join(" OR ")})` : one(t);
}

/** All tokens required. Returns null when the query has no searchable token. */
export function ftsAnd(query: string): string | null {
  const tokens = queryTokens(query);
  return tokens.length ? tokens.map(term).join(" AND ") : null;
}

/** Any token — the fallback when the strict query finds nothing. */
export function ftsOr(query: string): string | null {
  const tokens = queryTokens(query);
  return tokens.length ? tokens.map(term).join(" OR ") : null;
}

/**
 * How well the text explains the query, 0..1: exact word = 1, prefix-only = 0.6
 * («کفش» ≠ «کفشور»), synonyms count as exact.
 */
export function coverage(query: string, text: string): number {
  const tokens = queryTokens(query);
  if (!tokens.length) return 0;
  const words = normalizeText(text).split(" ");
  let hit = 0;
  for (const t of tokens) {
    const alts = SYN_INDEX.get(t) ?? [t];
    if (words.some((w) => alts.includes(w))) hit += 1;
    else if (words.some((w) => alts.some((a) => a.length >= 2 && w.startsWith(a)))) hit += 0.6;
  }
  return hit / tokens.length;
}

/** Share of the category's own words that the query mentions («گوشی» -> «گوشی موبایل» 0.5, «باتری گوشی موبایل» 0.33). */
export function categoryFit(query: string, category: string): number {
  const q = new Set(queryTokens(query));
  const words = normalizeText(category).split(" ").filter((w) => w.length > 1 && w !== "و");
  if (!words.length) return 0;
  return words.filter((w) => q.has(w)).length / words.length;
}

/** Persian titles start with the head noun («گوشی …», «باتری …», «کاور …»). */
export function headNounMatch(query: string, title: string): boolean {
  const q = queryTokens(query)[0];
  const t = normalizeText(title).split(" ")[0];
  return !!q && !!t && (q === t || (SYN_INDEX.get(q)?.includes(t) ?? false));
}

const ACCESSORY = /کیف|کاور|محافظ|باتری|باطری|تاچ|ال سی دی|فلت|قطعات|لوازم جانبی|یدکی|قاب|گلس|برد|بند/;

/** Accessory / spare-part category the query didn't ask for — rank it lower. */
export function unaskedAccessory(query: string, category: string): boolean {
  return ACCESSORY.test(category) && !ACCESSORY.test(normalizeText(query));
}
