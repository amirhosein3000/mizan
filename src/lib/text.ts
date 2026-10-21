import { toEnDigits } from "./format";

/**
 * Normalize Persian/English text for matching:
 * Arabic ي/ك -> Persian ی/ک, strip diacritics and tatweel, ZWNJ -> space,
 * Persian digits -> Latin, lowercase, punctuation -> space, collapse spaces.
 */
export function normalizeText(input: string): string {
  return toEnDigits(input)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[‌‍]/g, " ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Generic words that carry no identifying signal for product matching. */
export const STOP_WORDS = new Set([
  "گوشی", "موبایل", "مدل", "ظرفیت", "گیگابایت", "رم", "لپ", "تاپ", "لپتاپ", "اینچ",
  "کیلوگرم", "گرم", "لیتر", "میلی", "عددی", "بسته", "دستگاه", "و", "با", "برای",
  "the", "and", "with", "phone", "mobile", "model", "smartphone", "laptop", "inch", "gb", "ram",
]);

export function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(" ")
    .filter((t) => t.length > 0);
}
