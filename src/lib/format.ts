// Number, price and text helpers. All user-facing numbers go through here so
// the UI consistently shows Persian digits and Toman with thousands separators.

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const faInt = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const faDec1 = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });

/** Replace Latin digits with Persian digits. */
export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/** Replace Persian/Arabic digits with Latin digits (for parsing). */
export function toEnDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

/** 1234567 -> "۱٬۲۳۴٬۵۶۷" */
export function formatNumber(n: number): string {
  return faInt.format(Math.round(n));
}

/** 1234567 -> "۱٬۲۳۴٬۵۶۷ تومان" */
export function formatToman(n: number): string {
  return `${formatNumber(n)} تومان`;
}

/** Compact price for badges: 34_500_000 -> "۳۴٫۵ میلیون", 850_000 -> "۸۵۰ هزار". */
export function formatTomanShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${faDec1.format(n / 1_000_000_000)} میلیارد`;
  if (abs >= 1_000_000) return `${faDec1.format(n / 1_000_000)} میلیون`;
  if (abs >= 1_000) return `${faInt.format(n / 1_000)} هزار`;
  return formatNumber(n);
}

/** 0.123 -> "۱۲٪" */
export function formatPercent(ratio: number): string {
  return `${faInt.format(Math.round(ratio * 100))}٪`;
}

/**
 * Parse a user-typed or spoken price into Toman.
 * Accepts Persian/Arabic digits, separators, and the words میلیون / هزار.
 * "۳۵ میلیون" -> 35_000_000, "1,250,000" -> 1_250_000, "850 هزار" -> 850_000.
 */
export function parsePrice(input: string): number | null {
  if (!input) return null;
  let s = toEnDigits(input).replace(/[٬,،\s]/g, "").replace(/٫/g, ".");
  let mult = 1;
  if (/میلیارد/.test(s)) mult = 1_000_000_000;
  else if (/میلیون/.test(s)) mult = 1_000_000;
  else if (/هزار/.test(s)) mult = 1_000;
  const isRial = /ریال/.test(s);
  s = s.replace(/[^\d.]/g, "");
  if (!s) return null;
  const value = Number.parseFloat(s);
  if (!Number.isFinite(value) || value <= 0) return null;
  const toman = Math.round(value * mult);
  return isRial ? Math.round(toman / 10) : toman;
}

/** Round a price to a "nice" number a shopper would actually say out loud. */
export function roundNice(n: number): number {
  const step = n >= 10_000_000 ? 100_000 : n >= 1_000_000 ? 10_000 : n >= 100_000 ? 1_000 : 500;
  return Math.round(n / step) * step;
}

/** Relative time in Persian: "۳ دقیقه پیش". */
export function timeAgo(date: Date | string | number, now: number = Date.now()): string {
  const t = typeof date === "object" ? date.getTime() : new Date(date).getTime();
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 60) return "همین الان";
  const min = Math.round(sec / 60);
  if (min < 60) return `${formatNumber(min)} دقیقه پیش`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${formatNumber(hr)} ساعت پیش`;
  const day = Math.round(hr / 24);
  return `${formatNumber(day)} روز پیش`;
}
