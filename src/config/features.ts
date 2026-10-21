// Feature flags — one entry per module. Toggle `enabled` here (code config),
// or at build time with NEXT_PUBLIC_FEATURES_OFF / NEXT_PUBLIC_FEATURES_ON
// (comma-separated ids). Read on both server and client.
//
// Disabling a module hides its nav item / entry points, and its pages/APIs
// return 404 (see requireFeature in src/lib/features-server.ts).

export type FeatureId =
  // Core journey: find -> compare -> shops near you -> agent calls -> visit & track
  | "compare"
  | "agentCalls"
  | "map"
  | "track"
  | "alternatives"
  | "chat"
  // In the shop
  | "identify"
  | "xray"
  | "verdict"
  | "savings"
  | "shoppingList"
  | "voice"
  // Other side of the marketplace
  | "seller"
  | "history";

export type FeatureGroup = "core" | "instore" | "seller";

export interface FeatureDef {
  id: FeatureId;
  titleFa: string;
  descriptionFa: string;
  enabled: boolean;
  group: FeatureGroup;
  /** Route for modules that own a page. */
  href?: string;
  /** lucide-react icon name, mapped in components/icons.tsx. */
  icon: string;
}

export const FEATURES: FeatureDef[] = [
  { id: "compare", titleFa: "مقایسه‌ی کالاها", descriptionFa: "دو سه مدل رو کنار هم بذار", enabled: true, group: "core", icon: "compare" },
  { id: "agentCalls", titleFa: "تماس میزان با فروشگاه‌ها", descriptionFa: "موجودی و قیمت رو تلفنی تأیید می‌کنه", enabled: true, group: "core", icon: "phone" },
  { id: "map", titleFa: "نقشه‌ی فروشگاه‌ها", descriptionFa: "فروشگاه‌های اطرافت با فیلتر قسطی و باز", enabled: true, group: "core", href: "/map", icon: "map" },
  { id: "track", titleFa: "پیگیری‌ها", descriptionFa: "تماس‌ها، پیشنهادها و برنامه‌ی رفتن", enabled: true, group: "core", href: "/track", icon: "track" },
  { id: "alternatives", titleFa: "جایگزین‌ها", descriptionFa: "مدل‌های هم‌رده وقتی موجود نیست", enabled: true, group: "core", icon: "shuffle" },
  { id: "chat", titleFa: "بپرس از میزان", descriptionFa: "گفتگو درباره‌ی کالا و فروشگاه‌ها", enabled: true, group: "core", icon: "chat" },
  { id: "xray", titleFa: "ایکس‌ری قیمت", descriptionFa: "از قفسه عکس بگیر، رنگ‌ها رو ببین", enabled: true, group: "instore", href: "/xray", icon: "xray" },
  { id: "identify", titleFa: "شناسایی با عکس", descriptionFa: "از کالا یا برچسبش عکس بگیر", enabled: true, group: "instore", href: "/scan", icon: "camera" },
  { id: "verdict", titleFa: "داوری قیمت فروشنده", descriptionFa: "قیمتی که گفت خوبه یا گرون؟", enabled: true, group: "instore", icon: "gavel" },
  { id: "savings", titleFa: "کارت صرفه‌جویی", descriptionFa: "صرفه‌جویی‌ات رو به اشتراک بذار", enabled: true, group: "instore", icon: "sparkles" },
  { id: "shoppingList", titleFa: "لیست خرید", descriptionFa: "لیست بنویس، توی پاساژ تیک بزن", enabled: true, group: "instore", href: "/list", icon: "list" },
  { id: "voice", titleFa: "جستجوی صوتی", descriptionFa: "بگو، بنویسم", enabled: true, group: "instore", icon: "mic" },
  { id: "history", titleFa: "دیده‌شده‌ها", descriptionFa: "کالاهایی که دیدی و ذخیره کردی", enabled: true, group: "core", href: "/history", icon: "history" },
  { id: "seller", titleFa: "پنل فروشنده", descriptionFa: "جواب سؤال‌های میزان و به‌روز کردن قیمت", enabled: true, group: "seller", href: "/seller", icon: "store" },
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
