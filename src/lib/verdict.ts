// The price verdict: is the in-store price a good deal vs. the prices other
// Tehran shops listed on Torob (dataset)?
// Pure and synchronous so it runs instantly on the client and in tests.
import { formatPercent, formatToman, roundNice } from "./format";
import type { PriceSummary, ProductKind } from "./catalog/types";

export type VerdictLevel = "good" | "fair" | "high";

export interface Verdict {
  level: VerdictLevel;
  /** Short Persian headline, e.g. «قیمت خوبیه». */
  title: string;
  /** One or two Persian sentences explaining why. */
  reason: string;
  storePrice: number;
  /** storePrice - median (positive = more expensive than typical online). */
  diffFromMedian: number;
  diffFromMedianPct: number;
  /** storePrice - online minimum. */
  diffFromMin: number;
  /** Price worth asking the seller for. */
  targetPrice: number;
  /** Below every online offer by a wide margin: maybe fake, used, or unregistered. */
  suspiciouslyCheap: boolean;
  /** Store price is above the consumer price printed on the package. */
  abovePrintedPrice: boolean;
}

/** Thresholds relative to the online median. Tweak here only. */
export const THRESHOLDS = { good: 0.02, fair: 0.1, suspicious: 0.85 } as const;

export function computeVerdict(
  storePrice: number,
  summary: PriceSummary,
  opts: { printedPrice?: number } = {},
): Verdict {
  const { min, median } = summary;
  const diffFromMedian = storePrice - median;
  const pct = diffFromMedian / median;
  const diffFromMin = storePrice - min;
  const suspiciouslyCheap = storePrice < min * THRESHOLDS.suspicious;
  const abovePrintedPrice = !!opts.printedPrice && storePrice > opts.printedPrice;

  let level: VerdictLevel = pct <= THRESHOLDS.good ? "good" : pct <= THRESHOLDS.fair ? "fair" : "high";
  if (abovePrintedPrice) level = "high";

  const targetPrice =
    level === "good"
      ? roundNice(Math.min(storePrice, Math.max(min, storePrice * 0.98)))
      : roundNice(Math.max(min, median * 0.98));

  let title: string;
  let reason: string;
  if (abovePrintedPrice) {
    title = "گرون‌تر از قیمت روی بسته!";
    reason = `این قیمت از قیمت مصرف‌کننده‌ی چاپ‌شده (${formatToman(opts.printedPrice!)}) بیشتره. فروش بالاتر از قیمت درج‌شده مجاز نیست.`;
  } else if (suspiciouslyCheap) {
    title = "ارزون‌تر از همه — یه نگاه دقیق بنداز";
    reason = `${formatPercent(Math.abs(storePrice - min) / min)} زیر ارزون‌ترین قیمت ثبت‌شده در تهرانه. اصالت کالا، گارانتی و پلمپ بودنش رو حتماً چک کن.`;
  } else if (level === "good") {
    title = pct < -0.03 ? "معامله‌ی خوبیه!" : "قیمت خوبیه";
    reason =
      diffFromMedian <= 0
        ? `${formatToman(Math.abs(diffFromMedian))} ارزون‌تر از قیمت معمول بازار تهرانه.`
        : "تقریباً هم‌قیمت بازار تهرانه. اگه گارانتیش اوکیه، بخر.";
  } else if (level === "fair") {
    title = "منصفانه‌ست، ولی جای چونه داره";
    reason = `${formatPercent(pct)} بالاتر از قیمت معمول بازار تهرانه (${formatToman(diffFromMedian)} بیشتر).`;
  } else {
    title = "گرونه!";
    reason = `${formatPercent(pct)} بالاتر از قیمت معمول بازار تهرانه؛ یعنی ${formatToman(diffFromMedian)} بیشتر. ارزون‌ترین قیمت ثبت‌شده ${formatToman(min)} است.`;
  }

  return {
    level,
    title,
    reason,
    storePrice,
    diffFromMedian,
    diffFromMedianPct: pct,
    diffFromMin,
    targetPrice,
    suspiciouslyCheap,
    abovePrintedPrice,
  };
}

/** A line the shopper can say (or show) to the seller. */
export function negotiationLine(v: Verdict, summary: PriceSummary): string {
  if (v.abovePrintedPrice) {
    return `ببخشید، قیمت روی بسته کمتره. لطفاً با همون قیمت مصرف‌کننده حساب کنید.`;
  }
  if (v.level === "high") {
    return `آقا/خانم، همین مدل رو مغازه‌های دیگه‌ی تهران از ${formatToman(summary.min)} ثبت کردن. اگه ${formatToman(v.targetPrice)} حساب کنید، همین الان برمی‌دارم.`;
  }
  if (v.level === "fair") {
    return `قیمتتون منصفانه‌ست، ولی جاهای دیگه ارزون‌ترم هست. ${formatToman(v.targetPrice)} بدید، نقدی می‌خرم.`;
  }
  return `قیمت خوبیه. اگه ${formatToman(v.targetPrice)} حساب کنید یا یه هدیه کنارش بذارید، معامله تمومه.`;
}

/** What to check before paying, per product family. */
export const CHECKLISTS: Record<ProductKind, string[]> = {
  mobile: [
    "رجیستری: با شماره‌گیری *#06# شناسه (IMEI) رو ببین و در سامانه‌ی همتا استعلام کن.",
    "نوع گارانتی: شرکتی یا رسمی؟ اسم شرکت و مدت رو روی کارت گارانتی ببین.",
    "پلمپ جعبه سالم باشه و IMEI روی جعبه با گوشی یکی باشه.",
    "پارت‌نامبر (مثلاً ZAA یا LL/A) رو بپرس؛ روی قیمت اثر داره.",
  ],
  laptop: [
    "سیکل باتری و سلامت باتری رو جلوی خودت چک کن.",
    "کیبورد حروف فارسی داره یا لیبل چسبی؟",
    "شارژر اصلی همراهشه؟ مدلش با برند لپ‌تاپ یکیه؟",
    "گارانتی: شرکتی یا فروشگاهی؟ شامل باتری و شارژر هم میشه؟",
  ],
  appliance: [
    "گارانتی و خدمات پس از فروش: اسم شرکت، مدت و پوشش قطعات.",
    "برچسب انرژی رو ببین؛ رده‌ی A یا بالاتر قبض رو پایین نگه می‌داره.",
    "هزینه‌ی ارسال و نصب جداست یا داخل قیمته؟",
    "سال تولید و سالم بودن کارتن و بدنه رو قبل از تحویل چک کن.",
  ],
  other: [
    "مدل و مشخصات روی جعبه رو با چیزی که خواستی تطبیق بده.",
    "گارانتی یا ضمانت اصالت: کتبی و با مهر فروشگاه بگیر.",
    "فاکتور رسمی بگیر؛ برای مرجوعی و گارانتی لازمه.",
    "سالم بودن کالا و پلمپ رو همون‌جا جلوی فروشنده چک کن.",
  ],
};
