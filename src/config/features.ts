// Feature flags — one entry per module. Toggle `enabled` here (code config),
// or at build time with NEXT_PUBLIC_FEATURES_OFF / NEXT_PUBLIC_FEATURES_ON
// (comma-separated ids). Read on both server and client.
//
// Disabling a module hides its nav item and home tile, and its pages/APIs
// return 404 (see requireFeature in src/lib/features-server.ts).

export type FeatureId =
  | "identify"
  | "xray"
  | "verdict"
  | "alternatives"
  | "chat"
  | "history"
  | "savings"
  // Pre-built optional modules (src/modules/<id>):
  | "shoppingList"
  | "receipt"
  | "compare"
  | "priceHistory"
  | "nearby"
  | "voice"
  | "seller";

export interface FeatureDef {
  id: FeatureId;
  titleFa: string;
  descriptionFa: string;
  enabled: boolean;
  /** Route for modules that own a page. */
  href?: string;
  /** lucide-react icon name, mapped in components/icons.tsx. */
  icon: string;
  /** Show as a tile in the home "tools" grid. */
  homeTile?: boolean;
}

export const FEATURES: FeatureDef[] = [
  { id: "identify", titleFa: "شناسایی کالا", descriptionFa: "عکس، بارکد یا اسم", enabled: true, href: "/scan", icon: "scan" },
  { id: "xray", titleFa: "اشعه‌ی ایکس قیمت", descriptionFa: "قفسه رو اسکن کن، رنگ‌ها رو ببین", enabled: true, href: "/xray", icon: "xray" },
  { id: "verdict", titleFa: "داوری قیمت", descriptionFa: "خوبه، منصفانه یا گرون؟", enabled: true, icon: "gavel" },
  { id: "alternatives", titleFa: "جایگزین‌ها", descriptionFa: "مدل‌های هم‌رده‌ی ارزون‌تر", enabled: true, icon: "shuffle" },
  { id: "chat", titleFa: "بپرس از ترازو", descriptionFa: "گفتگو درباره‌ی کالا", enabled: true, icon: "chat" },
  { id: "history", titleFa: "ذخیره‌ها", descriptionFa: "تاریخچه و لیست خرید", enabled: true, href: "/history", icon: "history" },
  { id: "savings", titleFa: "کارت صرفه‌جویی", descriptionFa: "صرفه‌جویی‌ات رو به اشتراک بذار", enabled: true, icon: "sparkles" },
  // ---- optional modules ----
  { id: "shoppingList", titleFa: "لیست خرید", descriptionFa: "لیست بنویس، توی مغازه تیک بزن و با بودجه بسنج", enabled: true, href: "/list", icon: "list" },
  { id: "receipt", titleFa: "برچسب و فاکتور", descriptionFa: "از برچسب قیمت یا فاکتور عکس بگیر، ببین کجا گرون خریدی", enabled: true, href: "/receipt", icon: "receipt" },
  { id: "compare", titleFa: "مقایسه", descriptionFa: "دو سه کالا رو کنار هم بذار", enabled: true, href: "/compare", icon: "compare" },
  { id: "priceHistory", titleFa: "نمودار قیمت", descriptionFa: "روند ۳ ماه اخیر: الان بخرم یا صبر کنم؟", enabled: true, icon: "chart" },
  { id: "nearby", titleFa: "مغازه‌های نزدیک", descriptionFa: "کجای همین اطراف ارزون‌تره؟", enabled: true, icon: "map" },
  { id: "voice", titleFa: "جستجوی صوتی", descriptionFa: "بگو، بنویسم", enabled: true, icon: "mic" },
  { id: "seller", titleFa: "پنل فروشنده", descriptionFa: "قیمت مغازه‌ت در برابر بازار آنلاین", enabled: true, href: "/seller", icon: "store" },
];

function parseList(v: string | undefined): Set<string> {
  return new Set((v ?? "").split(",").map((s) => s.trim()).filter(Boolean));
}

const OFF = parseList(process.env.NEXT_PUBLIC_FEATURES_OFF);
const ON = parseList(process.env.NEXT_PUBLIC_FEATURES_ON);

export function isEnabled(id: FeatureId): boolean {
  if (OFF.has(id)) return false;
  if (ON.has(id)) return true;
  return FEATURES.find((f) => f.id === id)?.enabled ?? false;
}

export function enabledFeatures(): FeatureDef[] {
  return FEATURES.filter((f) => isEnabled(f.id));
}
