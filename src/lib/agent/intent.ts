// Understand a shopping request written (or spoken) in Persian:
// «یه هدفون انکر زیر ۵ میلیون نزدیک جمهوری می‌خوام، قسطی» ->
//   { query: "هدفون انکر", budgetMax: 5e6, place: جمهوری, installment: true }.
// Rule-based and pure, so it works with zero AI keys; the LLM path (lib/ai/understand.ts)
// only refines this result.
import { parsePrice, toEnDigits } from "../format";
import { findLandmark, type Landmark } from "../shop/places";

export interface Intent {
  /** What to search the catalog for. */
  query: string;
  budgetMax: number | null;
  budgetMin: number | null;
  place: Landmark | null;
  /** «نزدیک من», «اطراف خودم» — use GPS. */
  nearMe: boolean;
  installment: boolean;
  torobPayInPerson: boolean;
  openNow: boolean;
  warranty: boolean;
  fastDelivery: boolean;
  /** «فردا», «عصر» … a planned visit; null = now / unspecified. */
  when: "now" | "today_evening" | "tomorrow_morning" | "tomorrow_evening" | null;
}

const NUM = "[\\d.,٫٬]+";
const UNIT = "(?:\\s*(میلیون|میلیارد|هزار|تومن|تومان|ت))?";

/** Phrases to cut out of the query once understood. */
const STRIP: RegExp[] = [
  new RegExp(`(?:بین|از)\\s*${NUM}${UNIT}\\s*(?:تا|الی)\\s*${NUM}${UNIT}`, "g"),
  new RegExp(`(?:زیر|کمتر\\s*از|حداکثر|نهایتا|نهایتاً|تا|سقف|بودجه(?:\\s*ام)?(?:\\s*حدود)?)\\s*${NUM}${UNIT}`, "g"),
  new RegExp(`(?:بالای|بیشتر\\s*از|حداقل)\\s*${NUM}${UNIT}`, "g"),
  /(?:نزدیک|اطراف|حوالی|سمت|تو|توی|در|محدوده(?:\s*ی)?)\s+(?:من|خودم|خونه|خانه)/g,
  /قسطی|اقساطی|اقساط|قسط|اعتباری|ترب\s*پی|ترب‌پی|اسنپ\s*پی|دیجی\s*پی|تارا|ازکی\s*وام/g,
  /(?:همین\s*)?الان\s*باز(?:\s*باشه)?|باز\s*باشه|بازه|امشب|همین\s*الان/g,
  /با\s*گارانتی|گارانتی\s*دار|گارانتی/g,
  /ارسال\s*فوری|ارسال\s*سریع|فوری/g,
  /فردا\s*(?:صبح|عصر|شب)?|امروز\s*(?:عصر|شب)?|عصر|غروب/g,
  /حضوری/g,
];

const FILLER =
  /(?:^|\s)(?:سلام|لطفا|لطفاً|من|یه|یک|دنبال|می\s*خوام|میخوام|می‌خوام|می\s*خواستم|میخواستم|می‌خواستم|بخرم|برام|برای\s*خرید|پیدا\s*کن|پیدا\s*کنید|کجا|کجاها|میشه|داره|دارن|هست|هستش|بگرد|می‌گردم|میگردم|ممنون|مرسی|نزدیک|اطراف|حوالی|توی|تو|در|محدوده|سمت|خیابان|میدان|با|و|که|رو|را|،|,|\.|!|؟|\?)(?=\s|$)/g;

function parseAmount(num: string, unit: string | undefined): number | null {
  // Bare numbers below 1000 almost always mean «… میلیون» in shopping talk.
  const n = Number.parseFloat(toEnDigits(num).replace(/[,٬]/g, "").replace("٫", "."));
  if (!Number.isFinite(n)) return null;
  if (!unit || unit === "تومن" || unit === "تومان" || unit === "ت") return n < 1000 ? Math.round(n * 1_000_000) : Math.round(n);
  return parsePrice(`${num} ${unit}`);
}

export function parseIntent(text: string): Intent {
  const raw = text.replace(/‌/g, " ").trim();
  const t = toEnDigits(raw);
  let budgetMax: number | null = null;
  let budgetMin: number | null = null;

  const range = t.match(new RegExp(`(?:بین|از)\\s*(${NUM})${UNIT}\\s*(?:تا|الی)\\s*(${NUM})${UNIT}`));
  if (range) {
    const unit = range[4] ?? range[2];
    budgetMin = parseAmount(range[1], range[2] ?? unit);
    budgetMax = parseAmount(range[3], unit);
  } else {
    const max = t.match(new RegExp(`(?:زیر|کمتر\\s*از|حداکثر|نهایتا|نهایتاً|تا|سقف|بودجه(?:\\s*ام)?(?:\\s*حدود)?)\\s*(${NUM})${UNIT}`));
    if (max) budgetMax = parseAmount(max[1], max[2]);
    const min = t.match(new RegExp(`(?:بالای|بیشتر\\s*از|حداقل)\\s*(${NUM})${UNIT}`));
    if (min) budgetMin = parseAmount(min[1], min[2]);
  }

  const nearMe = /(?:نزدیک|اطراف|حوالی|دور\s*و\s*بر)\s*(?:من|خودم|خونه)/.test(t);
  const place = nearMe ? null : findLandmark(t);
  const installment = /قسط|اقساط|اعتباری|ترب\s*پی|ترب‌پی|اسنپ\s*پی|دیجی\s*پی|تارا|ازکی/.test(t);
  const torobPayInPerson = /ترب\s*پی|ترب‌پی/.test(t);
  const openNow = /الان\s*باز|باز\s*باشه|همین\s*الان|امشب/.test(t);
  const warranty = /گارانتی/.test(t);
  const fastDelivery = /ارسال\s*(?:فوری|سریع)/.test(t);
  const when = /فردا\s*(?:عصر|شب)/.test(t)
    ? "tomorrow_evening"
    : /فردا/.test(t)
      ? "tomorrow_morning"
      : /عصر|غروب|امروز\s*شب/.test(t)
        ? "today_evening"
        : openNow
          ? "now"
          : null;

  let q = t;
  for (const re of STRIP) q = q.replace(re, " ");
  if (place) {
    for (const name of [place.name, ...(place.aliases ?? [])]) q = q.replace(new RegExp(toEnDigits(name).replace(/[()]/g, "\\$&"), "g"), " ");
  }
  q = ` ${q.replace(/[،,.!؟?:;]/g, " ")} `.replace(FILLER, " ").replace(FILLER, " ");
  q = q.replace(/(?:^|\s)(?:تومن|تومان|ریال|میلیون|هزار)(?=\s|$)/g, " ");
  q = q.replace(/\s+/g, " ").trim();

  return {
    query: q,
    budgetMax,
    budgetMin,
    place,
    nearMe,
    installment,
    torobPayInPerson,
    openNow,
    warranty,
    fastDelivery,
    when,
  };
}

/** Planned visit time for a «when» phrase, in Tehran (UTC+03:30), or null for now. */
export function visitTimeFor(when: Intent["when"], now = Date.now()): number | null {
  if (!when || when === "now") return null;
  const tehranOffset = 3.5 * 3600_000;
  const local = new Date(now + tehranOffset);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - tehranOffset;
  const at = (d: number, h: number) => day + d * 86_400_000 + h * 3600_000;
  if (when === "today_evening") return Math.max(now, at(0, 18));
  if (when === "tomorrow_morning") return at(1, 11);
  return at(1, 18);
}
