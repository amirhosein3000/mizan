/**
 * Generates MOCK catalog data: ~300 Iranian-market products with 3–15 online
 * offers each. Prices are plausible but INVENTED — this is demo data, not real.
 *
 *   npm run seed            -> writes src/data/mock/products.json
 *
 * Deterministic (seeded RNG), so re-running produces the same file.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type CategoryId = "mobile" | "laptop" | "appliance" | "grocery";

interface SeedOffer {
  sellerId: string;
  sellerName: string;
  city: string;
  price: number;
  guarantee?: string;
  inStock: boolean;
  updatedAt: string;
}

interface SeedProduct {
  id: string;
  nameFa: string;
  nameEn: string;
  brand: string;
  brandFa: string;
  model: string;
  category: CategoryId;
  subcategory: string;
  barcode?: string;
  specs: Record<string, string>;
  printedPrice?: number;
  popular?: boolean;
  offers: SeedOffer[];
}

// ---------- deterministic RNG ----------
let seed = 20261021;
function rand(): number {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (a: number, b: number) => a + rand() * (b - a);
const intBetween = (a: number, b: number) => Math.floor(between(a, b + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

function roundPrice(n: number): number {
  const step = n >= 10_000_000 ? 100_000 : n >= 1_000_000 ? 10_000 : n >= 100_000 ? 1_000 : 500;
  return Math.max(step, Math.round(n / step) * step);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/\+/g, "-plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Valid EAN-13 from a 12-digit body. */
function ean13(prefix: string): string {
  let body = prefix;
  while (body.length < 12) body += String(intBetween(0, 9));
  body = body.slice(0, 12);
  const sum = body
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return body + String((10 - (sum % 10)) % 10);
}

// ---------- sellers (fictional) ----------
const SELLERS = [
  ["s01", "فروشگاه آنلاین کالانو", "تهران"],
  ["s02", "ستاره‌مارکت", "تهران"],
  ["s03", "موبایل‌شهر", "تهران"],
  ["s04", "تکنوسنتر پارس", "شیراز"],
  ["s05", "بازارچه‌ی مهر", "اصفهان"],
  ["s06", "دیجی‌بازار نمونه", "تهران"],
  ["s07", "خانه‌دار شاپ", "مشهد"],
  ["s08", "لوازم خانگی آریا", "تبریز"],
  ["s09", "سوپرمارکت آنلاین سبد", "تهران"],
  ["s10", "هایپر آنلاین نارنج", "کرج"],
  ["s11", "لپ‌تاپ‌سرا", "تهران"],
  ["s12", "گجت‌لند", "اصفهان"],
  ["s13", "ایران‌کالا ۲۴", "تهران"],
  ["s14", "فروشگاه البرز", "کرج"],
  ["s15", "مارکت محله", "رشت"],
  ["s16", "کالای دیجیتال سپهر", "مشهد"],
  ["s17", "پخش مستقیم پونه", "قم"],
  ["s18", "تهران‌استور", "تهران"],
] as const;

const SELLER_POOLS: Record<CategoryId, string[]> = {
  mobile: ["s01", "s02", "s03", "s04", "s06", "s12", "s13", "s16", "s18", "s05", "s14"],
  laptop: ["s01", "s04", "s06", "s11", "s12", "s13", "s16", "s18", "s02"],
  appliance: ["s01", "s05", "s07", "s08", "s13", "s14", "s02", "s18", "s10"],
  grocery: ["s09", "s10", "s15", "s17", "s01", "s02", "s13", "s05", "s14"],
};

const GUARANTEES: Record<CategoryId, string[]> = {
  mobile: ["گارانتی ۱۸ ماهه شرکتی", "گارانتی ۱۸ ماهه رسمی", "گارانتی ۲۴ ماهه شرکتی", "گارانتی ۶ ماهه فروشگاهی"],
  laptop: ["گارانتی ۱۸ ماهه شرکتی", "گارانتی ۲۴ ماهه رسمی", "گارانتی ۱۲ ماهه فروشگاهی"],
  appliance: ["گارانتی ۱۸ ماهه", "گارانتی ۲۴ ماهه", "گارانتی ۳۶ ماهه شرکتی"],
  grocery: [],
};

function makeOffers(category: CategoryId, median: number, opts: { capAt?: number } = {}): SeedOffer[] {
  const pool = [...SELLER_POOLS[category]].sort(() => rand() - 0.5);
  const n = Math.min(pool.length, intBetween(3, Math.min(15, pool.length + 4)));
  const spread = category === "grocery" ? 0.06 : 0.09;
  const offers: SeedOffer[] = [];
  for (let i = 0; i < n && i < pool.length; i++) {
    const s = SELLERS.find((x) => x[0] === pool[i])!;
    let factor = 1 + between(-spread, spread);
    if (rand() < 0.12) factor += between(0.08, 0.2); // occasional pricey seller
    let price = roundPrice(median * factor);
    if (opts.capAt) price = Math.min(price, opts.capAt);
    const daysAgo = intBetween(0, 6);
    offers.push({
      sellerId: s[0],
      sellerName: s[1],
      city: s[2],
      price,
      guarantee: GUARANTEES[category].length ? pick(GUARANTEES[category]) : undefined,
      inStock: rand() > 0.08 || i === 0,
      updatedAt: new Date(Date.UTC(2026, 9, 20 - daysAgo, intBetween(6, 20))).toISOString(),
    });
  }
  return offers.sort((a, b) => a.price - b.price);
}

const products: SeedProduct[] = [];
const seenIds = new Set<string>();
function add(p: Omit<SeedProduct, "offers">, median: number, opts: { capAt?: number } = {}) {
  let id = p.id;
  let k = 2;
  while (seenIds.has(id)) id = `${p.id}-${k++}`;
  seenIds.add(id);
  products.push({ ...p, id, offers: makeOffers(p.category, median, opts) });
}

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

// ---------- mobiles ----------
// [brand, brandFa, model, baseMillionToman, variants [storageGB, ramGB, mult], specs, barcodePrefix, popular]
type PhoneRow = [string, string, string, number, [number, number, number][], Record<string, string>, string, boolean?];
const PHONES: PhoneRow[] = [
  ["Samsung", "سامسونگ", "Galaxy A06", 8.4, [[64, 4, 1], [128, 4, 1.12]], { "صفحه": "۶٫۷ اینچ", "باتری": "۵۰۰۰ میلی‌آمپر", "دوربین": "۵۰ مگاپیکسل" }, "880609"],
  ["Samsung", "سامسونگ", "Galaxy A16", 12.9, [[128, 4, 1], [256, 8, 1.2]], { "صفحه": "۶٫۷ اینچ AMOLED", "باتری": "۵۰۰۰ میلی‌آمپر", "دوربین": "۵۰ مگاپیکسل" }, "880609"],
  ["Samsung", "سامسونگ", "Galaxy A26 5G", 17.5, [[128, 6, 1], [256, 8, 1.15]], { "صفحه": "۶٫۷ اینچ AMOLED", "شبکه": "5G", "باتری": "۵۰۰۰ میلی‌آمپر" }, "880609"],
  ["Samsung", "سامسونگ", "Galaxy A36 5G", 25.8, [[128, 8, 1], [256, 8, 1.12]], { "صفحه": "۶٫۷ اینچ AMOLED ۱۲۰ هرتز", "شبکه": "5G", "پردازنده": "Snapdragon 6 Gen 3" }, "880609", true],
  ["Samsung", "سامسونگ", "Galaxy A56 5G", 33.9, [[128, 8, 1], [256, 8, 1.1], [256, 12, 1.18]], { "صفحه": "۶٫۷ اینچ AMOLED ۱۲۰ هرتز", "شبکه": "5G", "پردازنده": "Exynos 1580" }, "880609", true],
  ["Samsung", "سامسونگ", "Galaxy S25 FE", 49.5, [[256, 8, 1], [512, 8, 1.15]], { "صفحه": "۶٫۷ اینچ", "پردازنده": "Exynos 2400", "دوربین": "۵۰ مگاپیکسل" }, "880609"],
  ["Samsung", "سامسونگ", "Galaxy S25", 74, [[256, 12, 1], [512, 12, 1.12]], { "صفحه": "۶٫۲ اینچ", "پردازنده": "Snapdragon 8 Elite", "دوربین": "۵۰ مگاپیکسل" }, "880609", true],
  ["Samsung", "سامسونگ", "Galaxy S25 Ultra", 128, [[256, 12, 1], [512, 12, 1.12], [1024, 12, 1.3]], { "صفحه": "۶٫۹ اینچ", "پردازنده": "Snapdragon 8 Elite", "دوربین": "۲۰۰ مگاپیکسل" }, "880609", true],
  ["Samsung", "سامسونگ", "Galaxy Z Flip7", 92, [[256, 12, 1], [512, 12, 1.1]], { "نوع": "تاشو", "صفحه": "۶٫۹ اینچ", "دوربین": "۵۰ مگاپیکسل" }, "880609"],
  ["Xiaomi", "شیائومی", "Redmi 14C", 7.9, [[128, 4, 1], [256, 8, 1.2]], { "صفحه": "۶٫۸۸ اینچ", "باتری": "۵۱۶۰ میلی‌آمپر" }, "694172"],
  ["Xiaomi", "شیائومی", "Redmi Note 14", 13.8, [[128, 6, 1], [256, 8, 1.15]], { "صفحه": "۶٫۶۷ اینچ AMOLED", "دوربین": "۱۰۸ مگاپیکسل" }, "694172", true],
  ["Xiaomi", "شیائومی", "Redmi Note 14 Pro", 21.5, [[256, 8, 1], [512, 12, 1.15]], { "صفحه": "۶٫۶۷ اینچ AMOLED", "دوربین": "۲۰۰ مگاپیکسل" }, "694172", true],
  ["Xiaomi", "شیائومی", "Redmi Note 14 Pro+ 5G", 29.5, [[256, 8, 1], [512, 12, 1.12]], { "صفحه": "۶٫۶۷ اینچ AMOLED", "شارژ": "۱۲۰ وات", "شبکه": "5G" }, "694172"],
  ["Xiaomi", "شیائومی", "Poco X7 Pro", 27.9, [[256, 8, 1], [512, 12, 1.12]], { "پردازنده": "Dimensity 8400 Ultra", "باتری": "۶۰۰۰ میلی‌آمپر" }, "694172"],
  ["Xiaomi", "شیائومی", "Poco F7", 37.5, [[256, 12, 1], [512, 12, 1.1]], { "پردازنده": "Snapdragon 8s Gen 4", "باتری": "۶۵۰۰ میلی‌آمپر" }, "694172"],
  ["Xiaomi", "شیائومی", "Xiaomi 15T", 49.9, [[256, 12, 1], [512, 12, 1.1]], { "دوربین": "لایکا ۵۰ مگاپیکسل", "صفحه": "۶٫۸۳ اینچ" }, "694172"],
  ["Apple", "اپل", "iPhone 13", 54, [[128, 4, 1], [256, 4, 1.15]], { "پردازنده": "A15 Bionic", "صفحه": "۶٫۱ اینچ" }, "019425"],
  ["Apple", "اپل", "iPhone 15", 79, [[128, 6, 1], [256, 6, 1.14]], { "پردازنده": "A16 Bionic", "درگاه": "USB-C" }, "019425"],
  ["Apple", "اپل", "iPhone 16", 94, [[128, 8, 1], [256, 8, 1.13]], { "پردازنده": "A18", "صفحه": "۶٫۱ اینچ" }, "019425", true],
  ["Apple", "اپل", "iPhone 16 Pro Max", 162, [[256, 8, 1], [512, 8, 1.15], [1024, 8, 1.32]], { "پردازنده": "A18 Pro", "صفحه": "۶٫۹ اینچ" }, "019425", true],
  ["Apple", "اپل", "iPhone 17", 112, [[256, 8, 1], [512, 8, 1.15]], { "پردازنده": "A19", "صفحه": "۶٫۳ اینچ ۱۲۰ هرتز" }, "019425"],
  ["Apple", "اپل", "iPhone 17 Pro Max", 198, [[256, 12, 1], [512, 12, 1.14], [1024, 12, 1.3]], { "پردازنده": "A19 Pro", "صفحه": "۶٫۹ اینچ" }, "019425"],
  ["Honor", "آنر", "Honor X8c", 14.9, [[256, 8, 1]], { "صفحه": "۶٫۷ اینچ AMOLED", "باتری": "۵۸۰۰ میلی‌آمپر" }, "693669"],
  ["Honor", "آنر", "Honor 400", 34.5, [[256, 12, 1], [512, 12, 1.12]], { "دوربین": "۲۰۰ مگاپیکسل", "صفحه": "۶٫۵۵ اینچ" }, "693669"],
  ["Motorola", "موتورولا", "Moto G85 5G", 15.2, [[256, 8, 1]], { "صفحه": "۶٫۶۷ اینچ pOLED", "شبکه": "5G" }, "084059"],
  ["Samsung", "سامسونگ", "Galaxy S24 FE", 42, [[128, 8, 1], [256, 8, 1.1]], { "صفحه": "۶٫۷ اینچ", "پردازنده": "Exynos 2400e" }, "880609"],
  ["Xiaomi", "شیائومی", "Redmi A5", 5.6, [[64, 3, 1], [128, 4, 1.15]], { "صفحه": "۶٫۸۸ اینچ", "باتری": "۵۲۰۰ میلی‌آمپر" }, "694172"],
  ["Xiaomi", "شیائومی", "Redmi 15", 10.9, [[128, 6, 1], [256, 8, 1.16]], { "صفحه": "۶٫۹ اینچ", "باتری": "۷۰۰۰ میلی‌آمپر" }, "694172"],
  ["Xiaomi", "شیائومی", "Poco M7 Pro 5G", 15.8, [[256, 8, 1], [512, 12, 1.15]], { "صفحه": "۶٫۶۷ اینچ AMOLED", "شبکه": "5G" }, "694172"],
  ["Realme", "ریلمی", "Realme C75", 9.4, [[128, 6, 1], [256, 8, 1.15]], { "صفحه": "۶٫۷۲ اینچ", "باتری": "۶۰۰۰ میلی‌آمپر" }, "694110"],
  ["Realme", "ریلمی", "Realme 14 Pro+", 31, [[256, 8, 1], [512, 12, 1.12]], { "دوربین": "۵۰ مگاپیکسل پریسکوپ", "صفحه": "۶٫۸۳ اینچ" }, "694110"],
  ["Tecno", "تکنو", "Spark 30 Pro", 9.9, [[256, 8, 1]], { "صفحه": "۶٫۷۸ اینچ AMOLED", "باتری": "۵۰۰۰ میلی‌آمپر" }, "616114"],
  ["Infinix", "اینفینیکس", "Hot 50", 8.2, [[128, 6, 1], [256, 8, 1.14]], { "صفحه": "۶٫۷۸ اینچ", "باتری": "۵۰۰۰ میلی‌آمپر" }, "616114"],
  ["Apple", "اپل", "iPhone 16e", 72, [[128, 8, 1], [256, 8, 1.14]], { "پردازنده": "A18", "صفحه": "۶٫۱ اینچ" }, "019425"],
  ["Apple", "اپل", "iPhone 14", 62, [[128, 6, 1], [256, 6, 1.14]], { "پردازنده": "A15 Bionic", "صفحه": "۶٫۱ اینچ" }, "019425"],
  ["Honor", "آنر", "Honor Magic7 Lite", 24.5, [[512, 8, 1]], { "باتری": "۶۶۰۰ میلی‌آمپر", "صفحه": "۶٫۷۸ اینچ AMOLED" }, "693669"],
  ["Nokia", "نوکیا", "Nokia 105 4G", 1.65, [[0, 0, 1]], { "نوع": "ساده (دکمه‌ای)", "باتری": "۱۴۵۰ میلی‌آمپر" }, "643810"],
];

for (const [brand, brandFa, model, base, variants, specs, prefix, popular] of PHONES) {
  for (const [storage, ram, mult] of variants) {
    const variant = storage ? `${storage >= 1024 ? storage / 1024 + "TB" : storage + "GB"}` : "";
    const ramStr = ram ? `RAM ${ram}GB` : "";
    const fullModel = [model, variant, ramStr].filter(Boolean).join(" ");
    // Some models already start with the brand ("Xiaomi 15T", "Honor X8c").
    const branded = model.startsWith(`${brand} `) ? model : `${brand} ${model}`;
    const storageFa = storage ? (storage >= 1024 ? `${fa(storage / 1024)} ترابایت` : `${fa(storage)} گیگابایت`) : "";
    const nameFa = [
      `گوشی موبایل ${brandFa} مدل ${model}`,
      storage ? `ظرفیت ${storageFa}` : "",
      ram ? `رم ${fa(ram)} گیگابایت` : "",
    ]
      .filter(Boolean)
      .join(" ");
    add(
      {
        id: slug(`${branded} ${variant} ${ram ? ram + "gb" : ""}`),
        nameFa,
        nameEn: [branded, variant, ramStr].filter(Boolean).join(" "),
        brand,
        brandFa,
        model: fullModel,
        category: "mobile",
        subcategory: "گوشی موبایل",
        barcode: ean13(prefix),
        specs: { ...specs, ...(storage ? { "حافظه": storageFa } : {}), ...(ram ? { "رم": `${fa(ram)} گیگابایت` } : {}) },
        popular: popular && mult === 1,
      },
      base * mult * 1_000_000,
    );
  }
}

// ---------- laptops ----------
type LaptopRow = [string, string, string, number, [string, string, number][], Record<string, string>, boolean?];
const LAPTOPS: LaptopRow[] = [
  ["ASUS", "ایسوس", "Vivobook Go 15 E1504FA", 24.5, [["Ryzen 5 7520U", "8GB/512GB", 1]], { "صفحه": "۱۵٫۶ اینچ FHD" }],
  ["ASUS", "ایسوس", "Vivobook 15 X1504VA", 38.5, [["Core i5-1335U", "8GB/512GB", 1], ["Core i7-1355U", "16GB/512GB", 1.25]], { "صفحه": "۱۵٫۶ اینچ FHD" }, true],
  ["ASUS", "ایسوس", "TUF Gaming F15 FX507ZC4", 68, [["Core i5-12500H", "16GB/512GB RTX 3050", 1]], { "صفحه": "۱۵٫۶ اینچ ۱۴۴ هرتز", "گرافیک": "RTX 3050" }, true],
  ["ASUS", "ایسوس", "ROG Strix G16 G614JV", 135, [["Core i7-13650HX", "16GB/1TB RTX 4060", 1]], { "صفحه": "۱۶ اینچ ۱۶۵ هرتز", "گرافیک": "RTX 4060" }],
  ["Lenovo", "لنوو", "IdeaPad Slim 3 15IRU8", 36.5, [["Core i3-1305U", "8GB/512GB", 1], ["Core i5-1335U", "16GB/512GB", 1.22]], { "صفحه": "۱۵٫۶ اینچ FHD" }, true],
  ["Lenovo", "لنوو", "LOQ 15IAX9", 72, [["Core i5-12450HX", "16GB/512GB RTX 3050", 1], ["Core i5-12450HX", "16GB/1TB RTX 4050", 1.18]], { "صفحه": "۱۵٫۶ اینچ ۱۴۴ هرتز" }],
  ["Lenovo", "لنوو", "ThinkPad E14 Gen 5", 58, [["Core i5-1335U", "16GB/512GB", 1]], { "صفحه": "۱۴ اینچ WUXGA", "وزن": "۱٫۴ کیلوگرم" }],
  ["Lenovo", "لنوو", "Legion 5 16IRX9", 128, [["Core i7-14650HX", "32GB/1TB RTX 4060", 1]], { "صفحه": "۱۶ اینچ ۱۶۵ هرتز", "گرافیک": "RTX 4060" }],
  ["HP", "اچ‌پی", "15-fd0", 34, [["Core i3-1315U", "8GB/512GB", 1], ["Core i5-1335U", "16GB/512GB", 1.24]], { "صفحه": "۱۵٫۶ اینچ FHD" }],
  ["HP", "اچ‌پی", "Victus 15-fa1", 64, [["Core i5-13420H", "16GB/512GB RTX 3050", 1], ["Core i7-13620H", "16GB/1TB RTX 4050", 1.25]], { "صفحه": "۱۵٫۶ اینچ ۱۴۴ هرتز" }],
  ["HP", "اچ‌پی", "Pavilion 15-eg3", 49, [["Core i5-1335U", "16GB/512GB", 1]], { "صفحه": "۱۵٫۶ اینچ FHD" }],
  ["Acer", "ایسر", "Aspire 7 A715-76G", 54, [["Core i5-12450H", "16GB/512GB RTX 2050", 1]], { "صفحه": "۱۵٫۶ اینچ FHD" }],
  ["Acer", "ایسر", "Nitro V 15 ANV15-51", 66, [["Core i5-13420H", "16GB/512GB RTX 4050", 1]], { "صفحه": "۱۵٫۶ اینچ ۱۴۴ هرتز" }],
  ["Dell", "دل", "Vostro 3520", 33, [["Core i3-1215U", "8GB/256GB", 1], ["Core i5-1235U", "8GB/512GB", 1.2]], { "صفحه": "۱۵٫۶ اینچ FHD" }],
  ["Apple", "اپل", "MacBook Air 13 M3", 88, [["M3 8-core", "16GB/256GB", 1], ["M3 8-core", "16GB/512GB", 1.2]], { "صفحه": "۱۳٫۶ اینچ Liquid Retina", "وزن": "۱٫۲۴ کیلوگرم" }, true],
  ["Apple", "اپل", "MacBook Air 13 M4", 104, [["M4 10-core", "16GB/256GB", 1], ["M4 10-core", "16GB/512GB", 1.18]], { "صفحه": "۱۳٫۶ اینچ Liquid Retina" }],
  ["Apple", "اپل", "MacBook Pro 14 M4", 168, [["M4 10-core", "16GB/512GB", 1], ["M4 Pro", "24GB/512GB", 1.3]], { "صفحه": "۱۴٫۲ اینچ XDR" }],
  ["ASUS", "ایسوس", "Zenbook 14 OLED UX3405MA", 82, [["Core Ultra 5 125H", "16GB/512GB", 1], ["Core Ultra 7 155H", "32GB/1TB", 1.28]], { "صفحه": "۱۴ اینچ OLED" }],
  ["ASUS", "ایسوس", "Vivobook 16 X1605VA", 41, [["Core i5-13500H", "8GB/512GB", 1], ["Core i7-13700H", "16GB/1TB", 1.3]], { "صفحه": "۱۶ اینچ WUXGA" }],
  ["Lenovo", "لنوو", "IdeaPad Slim 5 14IMH9", 56, [["Core Ultra 5 125H", "16GB/512GB", 1], ["Core Ultra 7 155H", "16GB/1TB", 1.22]], { "صفحه": "۱۴ اینچ OLED" }],
  ["HP", "اچ‌پی", "250 G10", 29, [["Core i3-1315U", "8GB/256GB", 1], ["Core i5-1335U", "8GB/512GB", 1.22]], { "صفحه": "۱۵٫۶ اینچ" }],
  ["Acer", "ایسر", "Swift Go 14 SFG14-73", 62, [["Core Ultra 5 125H", "16GB/512GB", 1]], { "صفحه": "۱۴ اینچ OLED" }],
  ["Dell", "دل", "Inspiron 15 3530", 37, [["Core i5-1334U", "8GB/512GB", 1], ["Core i7-1355U", "16GB/512GB", 1.24]], { "صفحه": "۱۵٫۶ اینچ ۱۲۰ هرتز" }],
  ["Huawei", "هوآوی", "MateBook D16", 52, [["Core i5-13420H", "16GB/512GB", 1], ["Core i7-13700H", "16GB/1TB", 1.2]], { "صفحه": "۱۶ اینچ" }],
  ["Microsoft", "مایکروسافت", "Surface Laptop 7 13.8", 118, [["Snapdragon X Plus", "16GB/512GB", 1]], { "صفحه": "۱۳٫۸ اینچ PixelSense" }],
  ["MSI", "ام‌اس‌آی", "Thin GF63 12UC", 58, [["Core i5-12450H", "8GB/512GB RTX 3050", 1]], { "صفحه": "۱۵٫۶ اینچ ۱۴۴ هرتز" }],
];
for (const [brand, brandFa, model, base, variants, specs, popular] of LAPTOPS) {
  for (const [cpu, memory, mult] of variants) {
    const [ram, storageAndGpu] = memory.split("/");
    const fullModel = `${model} ${cpu} ${memory}`;
    add(
      {
        id: slug(`${brand} ${model} ${cpu} ${memory}`),
        nameFa: `لپ‌تاپ ${brandFa} مدل ${model} پردازنده ${cpu} رم ${ram.replace("GB", " گیگ")}`,
        nameEn: `${brand} ${fullModel}`,
        brand,
        brandFa,
        model: fullModel,
        category: "laptop",
        subcategory: "لپ‌تاپ",
        barcode: ean13(brand === "Apple" ? "019425" : brand === "HP" ? "019644" : brand === "Lenovo" ? "019703" : "471103"),
        specs: { "پردازنده": cpu, "رم": ram, "حافظه و گرافیک": storageAndGpu, ...specs },
        popular: popular && mult === 1,
      },
      base * mult * 1_000_000,
    );
  }
}

// ---------- home appliances ----------
// [subcategoryFa, brand, brandFa, model, nameFaPrefix, millionToman, specs, popular]
type ApplianceRow = [string, string, string, string, string, number, Record<string, string>, boolean?];
const APPLIANCES: ApplianceRow[] = [
  ["یخچال و فریزر", "Snowa", "اسنوا", "SN8-2350", "یخچال فریزر ساید بای ساید", 68, { "حجم": "۷۰۰ لیتر", "رده انرژی": "A+" }, true],
  ["یخچال و فریزر", "Snowa", "اسنوا", "SR-T5020", "یخچال فریزر بالا پایین", 42, { "حجم": "۵۰۰ لیتر", "رده انرژی": "A" }],
  ["یخچال و فریزر", "Emersun", "امرسان", "BFN22D-M", "یخچال فریزر پایین", 45, { "حجم": "۵۵۰ لیتر", "رده انرژی": "A+" }],
  ["یخچال و فریزر", "Emersun", "امرسان", "TFH20T", "یخچال فریزر بالا", 31, { "حجم": "۴۲۰ لیتر" }],
  ["یخچال و فریزر", "LG", "ال‌جی", "GC-B257SLWL", "یخچال فریزر ساید بای ساید", 175, { "حجم": "۶۹۴ لیتر", "کمپرسور": "اینورتر" }],
  ["یخچال و فریزر", "Samsung", "سامسونگ", "RS64R5111M9", "یخچال فریزر ساید بای ساید", 158, { "حجم": "۶۴۷ لیتر", "کمپرسور": "اینورتر" }],
  ["یخچال و فریزر", "Daewoo", "دوو", "D2BF-0034", "یخچال فریزر پایین", 58, { "حجم": "۶۰۰ لیتر" }],
  ["یخچال و فریزر", "Pakshoma", "پاکشوما", "PRF-650", "یخچال فریزر دوقلو", 72, { "حجم": "۶۵۰ لیتر" }],
  ["ماشین لباسشویی", "Snowa", "اسنوا", "SWM-84516", "ماشین لباسشویی", 29.5, { "ظرفیت": "۸ کیلوگرم", "دور موتور": "۱۴۰۰" }, true],
  ["ماشین لباسشویی", "Pakshoma", "پاکشوما", "BWF-40903", "ماشین لباسشویی", 27, { "ظرفیت": "۹ کیلوگرم" }],
  ["ماشین لباسشویی", "LG", "ال‌جی", "F4V5VYP0W", "ماشین لباسشویی", 74, { "ظرفیت": "۹ کیلوگرم", "موتور": "دایرکت درایو" }],
  ["ماشین لباسشویی", "Samsung", "سامسونگ", "WW90T4040CE", "ماشین لباسشویی", 68, { "ظرفیت": "۹ کیلوگرم", "موتور": "اینورتر" }],
  ["ماشین لباسشویی", "Bosch", "بوش", "WGA244ZEN", "ماشین لباسشویی", 89, { "ظرفیت": "۹ کیلوگرم" }],
  ["ماشین لباسشویی", "Daewoo", "دوو", "DWK-8540", "ماشین لباسشویی", 33, { "ظرفیت": "۸ کیلوگرم" }],
  ["تلویزیون", "Snowa", "اسنوا", "SSD-43SA1560", "تلویزیون هوشمند ۴۳ اینچ", 17.5, { "اندازه": "۴۳ اینچ", "کیفیت": "Full HD" }],
  ["تلویزیون", "X.Vision", "ایکس‌ویژن", "50XCU745", "تلویزیون هوشمند ۵۰ اینچ", 24.8, { "اندازه": "۵۰ اینچ", "کیفیت": "4K" }, true],
  ["تلویزیون", "X.Vision", "ایکس‌ویژن", "43XC635", "تلویزیون ۴۳ اینچ", 15.9, { "اندازه": "۴۳ اینچ" }],
  ["تلویزیون", "LG", "ال‌جی", "55UR8050", "تلویزیون هوشمند ۵۵ اینچ", 54, { "اندازه": "۵۵ اینچ", "کیفیت": "4K UHD" }, true],
  ["تلویزیون", "LG", "ال‌جی", "OLED55C4", "تلویزیون OLED ۵۵ اینچ", 128, { "اندازه": "۵۵ اینچ", "پنل": "OLED" }],
  ["تلویزیون", "Samsung", "سامسونگ", "65DU8000", "تلویزیون هوشمند ۶۵ اینچ", 84, { "اندازه": "۶۵ اینچ", "کیفیت": "4K" }],
  ["تلویزیون", "Samsung", "سامسونگ", "55Q60D", "تلویزیون QLED ۵۵ اینچ", 66, { "اندازه": "۵۵ اینچ", "پنل": "QLED" }],
  ["تلویزیون", "TCL", "تی‌سی‌ال", "55P755", "تلویزیون هوشمند ۵۵ اینچ", 34.5, { "اندازه": "۵۵ اینچ", "سیستم‌عامل": "Google TV" }],
  ["تلویزیون", "Xiaomi", "شیائومی", "TV A 43 2025", "تلویزیون هوشمند ۴۳ اینچ", 16.8, { "اندازه": "۴۳ اینچ", "سیستم‌عامل": "Google TV" }],
  ["تلویزیون", "G Plus", "جی‌پلاس", "GTV-50RU732S", "تلویزیون هوشمند ۵۰ اینچ", 23.5, { "اندازه": "۵۰ اینچ", "کیفیت": "4K" }],
  ["جاروبرقی", "Pars Khazar", "پارس خزر", "VC-2200W", "جاروبرقی", 7.9, { "توان": "۲۲۰۰ وات" }, true],
  ["جاروبرقی", "Bosch", "بوش", "BGS41ZOOU", "جاروبرقی بدون کیسه", 15.5, { "توان": "۷۰۰ وات" }],
  ["جاروبرقی", "Philips", "فیلیپس", "FC9332", "جاروبرقی بدون کیسه", 11.8, { "توان": "۱۹۰۰ وات" }],
  ["جاروبرقی", "Xiaomi", "شیائومی", "Robot Vacuum S20", "جاروبرقی رباتیک", 19.5, { "نوع": "رباتیک", "ناوبری": "LDS" }],
  ["جاروبرقی", "Samsung", "سامسونگ", "VC20M2530", "جاروبرقی", 9.6, { "توان": "۲۰۰۰ وات" }],
  ["جاروبرقی", "Gosonic", "گوسونیک", "GVC-6225", "جاروبرقی", 5.2, { "توان": "۲۲۰۰ وات" }],
  ["مایکروویو", "Samsung", "سامسونگ", "MC32K7055", "مایکروفر", 21.5, { "حجم": "۳۲ لیتر" }],
  ["مایکروویو", "LG", "ال‌جی", "MH8265DIS", "مایکروویو", 16.9, { "حجم": "۴۲ لیتر" }],
  ["مایکروویو", "Pars Khazar", "پارس خزر", "MW-2500", "مایکروویو", 6.9, { "حجم": "۲۵ لیتر" }],
  ["مایکروویو", "Snowa", "اسنوا", "SM-284", "مایکروویو", 7.8, { "حجم": "۲۸ لیتر" }],
  ["سرخ‌کن", "Philips", "فیلیپس", "HD9252", "سرخ‌کن بدون روغن", 9.8, { "ظرفیت": "۴٫۱ لیتر" }, true],
  ["سرخ‌کن", "Philips", "فیلیپس", "HD9285", "سرخ‌کن بدون روغن XXL", 18.5, { "ظرفیت": "۷٫۲ لیتر" }],
  ["سرخ‌کن", "Pars Khazar", "پارس خزر", "AF-5000", "سرخ‌کن بدون روغن", 4.6, { "ظرفیت": "۵ لیتر" }],
  ["سرخ‌کن", "Xiaomi", "شیائومی", "Smart Air Fryer 6.5L", "سرخ‌کن هوشمند", 6.4, { "ظرفیت": "۶٫۵ لیتر" }],
  ["سرخ‌کن", "Delmonti", "دلمونتی", "DL-560", "سرخ‌کن بدون روغن", 3.9, { "ظرفیت": "۶ لیتر" }],
  ["سرخ‌کن", "Gosonic", "گوسونیک", "GAF-850", "سرخ‌کن بدون روغن", 3.4, { "ظرفیت": "۵ لیتر" }],
  ["چای‌ساز", "Pars Khazar", "پارس خزر", "TM-3500", "چای‌ساز", 3.1, { "ظرفیت": "۲ لیتر" }],
  ["چای‌ساز", "Gosonic", "گوسونیک", "GST-876", "چای‌ساز", 1.9, { "ظرفیت": "۱٫۸ لیتر" }],
  ["چای‌ساز", "Feller", "فلر", "TS-090", "چای‌ساز", 2.6, { "ظرفیت": "۱٫۷ لیتر" }],
  ["چای‌ساز", "Bosch", "بوش", "TTA2010", "چای‌ساز", 5.4, { "ظرفیت": "۱٫۷ لیتر" }],
  ["اتو", "Philips", "فیلیپس", "GC4567", "اتو بخار", 4.2, { "توان": "۲۶۰۰ وات" }],
  ["اتو", "Bosch", "بوش", "TDA5028010", "اتو بخار", 3.6, { "توان": "۲۸۰۰ وات" }],
  ["اتو", "Pars Khazar", "پارس خزر", "SI-2400", "اتو بخار", 1.8, { "توان": "۲۴۰۰ وات" }],
  ["اجاق گاز", "Akhavan", "اخوان", "G-29", "اجاق گاز صفحه‌ای", 14.5, { "شعله": "۵ شعله", "جنس": "شیشه" }],
  ["اجاق گاز", "Ilia Steel", "ایلیا استیل", "IS-512", "اجاق گاز صفحه‌ای", 17.8, { "شعله": "۵ شعله", "جنس": "استیل" }],
  ["اجاق گاز", "Tacnogaz", "تکنوگاز", "TG-600", "اجاق گاز فردار", 24.5, { "شعله": "۵ شعله", "فر": "دارد" }],
  ["کولر گازی", "Gree", "گری", "Pular 18000", "کولر گازی اینورتر", 44, { "ظرفیت": "۱۸۰۰۰ BTU", "کمپرسور": "اینورتر" }],
  ["کولر گازی", "Midea", "مدیا", "MSAFB-18HRN1", "کولر گازی", 39.5, { "ظرفیت": "۱۸۰۰۰ BTU" }],
  ["کولر گازی", "TCL", "تی‌سی‌ال", "TAC-24CHSA", "کولر گازی اینورتر", 52, { "ظرفیت": "۲۴۰۰۰ BTU" }],
  ["کولر گازی", "Gree", "گری", "Lomo 12000", "کولر گازی", 31, { "ظرفیت": "۱۲۰۰۰ BTU" }],
  ["ماشین ظرفشویی", "Bosch", "بوش", "SMS4HVI33E", "ماشین ظرفشویی", 69, { "ظرفیت": "۱۳ نفره" }],
  ["ماشین ظرفشویی", "Snowa", "اسنوا", "SWD-226", "ماشین ظرفشویی", 34, { "ظرفیت": "۱۴ نفره" }],
  ["ماشین ظرفشویی", "Midea", "مدیا", "WQP12-5203", "ماشین ظرفشویی", 39, { "ظرفیت": "۱۲ نفره" }],
  ["ماشین ظرفشویی", "LG", "ال‌جی", "DFB512FP", "ماشین ظرفشویی", 78, { "ظرفیت": "۱۴ نفره", "موتور": "اینورتر" }],
  ["آبمیوه‌گیری و غذاساز", "Pars Khazar", "پارس خزر", "FP-1200", "غذاساز", 5.8, { "توان": "۱۲۰۰ وات" }],
  ["آبمیوه‌گیری و غذاساز", "Philips", "فیلیپس", "HR7530", "غذاساز", 9.2, { "توان": "۸۵۰ وات" }],
  ["آبمیوه‌گیری و غذاساز", "Bosch", "بوش", "MUM5", "همزن کاسه‌دار", 19.5, { "توان": "۱۰۰۰ وات" }],
  ["آبمیوه‌گیری و غذاساز", "Gosonic", "گوسونیک", "GSB-405", "مخلوط‌کن", 2.2, { "توان": "۶۰۰ وات" }],
  ["قهوه‌ساز", "Delonghi", "دلونگی", "EC685", "اسپرسوساز", 22, { "فشار": "۱۵ بار" }],
  ["قهوه‌ساز", "Gosonic", "گوسونیک", "GEM-866", "اسپرسوساز", 6.5, { "فشار": "۲۰ بار" }],
  ["قهوه‌ساز", "Feller", "فلر", "ES-110", "اسپرسوساز", 5.4, { "فشار": "۱۵ بار" }],
  ["بخاری و پکیج", "Butane", "بوتان", "Pars 24", "پکیج دیواری", 38, { "توان": "۲۴۰۰۰ کیلوکالری" }],
  ["بخاری و پکیج", "Iran Radiator", "ایران رادیاتور", "M24FF", "پکیج دیواری", 36.5, { "توان": "۲۴۰۰۰ کیلوکالری" }],
  ["بخاری و پکیج", "Absal", "آبسال", "GH-8000", "بخاری گازی", 9.5, { "توان": "۸۰۰۰ کیلوکالری" }],
];
for (const [sub, brand, brandFa, model, nameFaPrefix, base, specs, popular] of APPLIANCES) {
  add(
    {
      id: slug(`${brand} ${model}`),
      nameFa: `${nameFaPrefix} ${brandFa} مدل ${model}`,
      nameEn: `${brand} ${model}`,
      brand,
      brandFa,
      model,
      category: "appliance",
      subcategory: sub,
      barcode: ean13(["Snowa", "Pars Khazar", "Pakshoma", "Emersun", "X.Vision", "Akhavan", "Ilia Steel", "Butane", "Iran Radiator", "Absal", "Delmonti", "G Plus", "Gosonic", "Tacnogaz"].includes(brand) ? "626" : "880"),
      specs,
      popular,
    },
    base * 1_000_000,
  );
}

// ---------- groceries ----------
// [subcategoryFa, brand, brandFa, productFa, productEn, sizeFa, sizeEn, printedPriceToman, popular]
type GroceryRow = [string, string, string, string, string, string, string, number, boolean?];
const GROCERIES: GroceryRow[] = [
  ["برنج", "Golestan", "گلستان", "برنج طارم هاشمی", "Tarom Hashemi Rice", "۵ کیلوگرم", "5kg", 1_150_000, true],
  ["برنج", "Golestan", "گلستان", "برنج طارم هاشمی", "Tarom Hashemi Rice", "۱۰ کیلوگرم", "10kg", 2_250_000],
  ["برنج", "Mahmood", "محمود", "برنج پاکستانی", "Basmati Rice", "۱۰ کیلوگرم", "10kg", 1_380_000],
  ["برنج", "Shahsavand", "شاهسوند", "برنج دم‌سیاه", "Domsiah Rice", "۵ کیلوگرم", "5kg", 1_240_000],
  ["چای", "Golestan", "گلستان", "چای سیاه ممتاز", "Premium Black Tea", "۴۵۰ گرم", "450g", 465_000, true],
  ["چای", "Mahmood", "محمود", "چای کله مورچه", "CTC Black Tea", "۵۰۰ گرم", "500g", 398_000],
  ["چای", "Ahmad", "احمد", "چای ارل گری", "Earl Grey Tea", "۵۰۰ گرم", "500g", 520_000],
  ["چای", "Shahrzad", "شهرزاد", "چای سیاه عطری", "Aromatic Black Tea", "۴۵۰ گرم", "450g", 385_000],
  ["چای", "Do Ghazal", "دوغزال", "چای سیاه سیلان", "Ceylon Black Tea", "۵۰۰ گرم", "500g", 495_000],
  ["روغن", "Ladan", "لادن", "روغن مایع سرخ‌کردنی", "Frying Oil", "۱٫۳۵ لیتر", "1.35L", 178_000, true],
  ["روغن", "Ladan", "لادن", "روغن مایع آفتابگردان", "Sunflower Oil", "۸۱۰ گرم", "810g", 112_000],
  ["روغن", "Oila", "اویلا", "روغن مایع سرخ‌کردنی", "Frying Oil", "۱٫۳۵ لیتر", "1.35L", 185_000],
  ["روغن", "Bahar", "بهار", "روغن نیمه‌جامد", "Semi-solid Oil", "۴ کیلوگرم", "4kg", 720_000],
  ["روغن", "Famila", "فامیلا", "روغن کنجد", "Sesame Oil", "۹۰۰ میلی‌لیتر", "900ml", 365_000],
  ["ماکارونی", "Zar", "زر", "ماکارونی فرمی", "Spaghetti 1.2mm", "۷۰۰ گرم", "700g", 62_000, true],
  ["ماکارونی", "Tak", "تک", "ماکارونی فرمی", "Spaghetti", "۷۰۰ گرم", "700g", 64_500],
  ["ماکارونی", "Mana", "مانا", "پاستا پنه", "Penne Pasta", "۵۰۰ گرم", "500g", 54_000],
  ["لبنیات", "Kalleh", "کاله", "شیر کم‌چرب", "Low-fat Milk", "۱ لیتر", "1L", 47_000, true],
  ["لبنیات", "Pegah", "پگاه", "شیر کم‌چرب", "Low-fat Milk", "۱ لیتر", "1L", 42_000],
  ["لبنیات", "Damdaran", "دامداران", "ماست پرچرب", "Full-fat Yogurt", "۱۵۰۰ گرم", "1.5kg", 118_000],
  ["لبنیات", "Kalleh", "کاله", "پنیر سفید UF", "UF White Cheese", "۴۰۰ گرم", "400g", 129_000],
  ["لبنیات", "Mihan", "میهن", "پنیر لیقوان", "Lighvan Cheese", "۴۰۰ گرم", "400g", 165_000],
  ["لبنیات", "Pegah", "پگاه", "کره حیوانی", "Butter", "۱۰۰ گرم", "100g", 72_000],
  ["لبنیات", "Damdaran", "دامداران", "دوغ گازدار", "Sparkling Doogh", "۱٫۵ لیتر", "1.5L", 48_000],
  ["لبنیات", "Kalleh", "کاله", "خامه صبحانه", "Breakfast Cream", "۲۰۰ گرم", "200g", 55_000],
  ["نوشیدنی", "Khoshgovar", "خوشگوار", "نوشابه کوکاکولا", "Coca-Cola", "۱٫۵ لیتر", "1.5L", 52_000],
  ["نوشیدنی", "Zamzam", "زمزم", "نوشابه کولا", "Zamzam Cola", "۱٫۵ لیتر", "1.5L", 41_000, true],
  ["نوشیدنی", "Damavand", "دماوند", "آب معدنی", "Mineral Water", "۱٫۵ لیتر", "1.5L", 14_500],
  ["نوشیدنی", "Sunich", "سن‌ایچ", "آبمیوه پرتقال", "Orange Juice", "۱ لیتر", "1L", 78_000],
  ["نوشیدنی", "Takdaneh", "تکدانه", "آبمیوه سیب", "Apple Juice", "۱ لیتر", "1L", 69_000],
  ["نوشیدنی", "Delester", "دلستر", "ماءالشعیر لیمویی", "Lemon Malt Drink", "۱ لیتر", "1L", 49_000],
  ["قهوه", "Nescafe", "نسکافه", "قهوه فوری گلد", "Gold Instant Coffee", "۲۰۰ گرم", "200g", 1_390_000],
  ["قهوه", "Nescafe", "نسکافه", "کافی‌میکس ۳ در ۱", "3in1 Coffee Mix", "۲۰ عددی", "20pcs", 285_000],
  ["قهوه", "Ali Cafe", "علی کافه", "قهوه فوری ۲ در ۱", "2in1 Coffee", "۲۰ عددی", "20pcs", 310_000],
  ["قهوه", "Lamiz", "لمیز", "قهوه اسپرسو آسیاب‌شده", "Ground Espresso", "۲۵۰ گرم", "250g", 495_000],
  ["تنقلات", "Shirin Asal", "شیرین عسل", "شکلات تخته‌ای تلخ ۷۰٪", "Dark Chocolate 70%", "۱۰۰ گرم", "100g", 68_000],
  ["تنقلات", "Minoo", "مینو", "بیسکویت مادر", "Madar Biscuit", "۶۰۰ گرم", "600g", 95_000, true],
  ["تنقلات", "Cheetoz", "چی‌توز", "چیپس ساده", "Plain Chips", "بزرگ", "Large", 45_000],
  ["تنقلات", "Maz Maz", "مزمز", "چیپس سرکه نمکی", "Salt & Vinegar Chips", "بزرگ", "Large", 48_000],
  ["تنقلات", "Aidin", "آیدین", "ویفر شکلاتی", "Chocolate Wafer", "۴۵ گرم", "45g", 14_000],
  ["تنقلات", "Farmand", "فرمند", "شکلات شیری مغزدار", "Milk Chocolate with Nuts", "۸۵ گرم", "85g", 59_000],
  ["تنقلات", "Gaz Sekeh", "گز سکه", "گز آردی ۴۰٪ پسته", "Gaz 40% Pistachio", "۴۵۰ گرم", "450g", 640_000],
  ["کنسرو", "Shilan", "شیلان", "کنسرو تن ماهی", "Tuna in Oil", "۱۸۰ گرم", "180g", 118_000, true],
  ["کنسرو", "Tabiat", "طبیعت", "کنسرو تن ماهی", "Tuna in Oil", "۱۸۰ گرم", "180g", 112_000],
  ["کنسرو", "Behrouz", "بهروز", "کنسرو لوبیا چیتی", "Pinto Beans", "۴۰۰ گرم", "400g", 48_000],
  ["کنسرو", "Yek o Yek", "یک و یک", "کنسرو خوراک بادمجان", "Eggplant Stew", "۳۸۰ گرم", "380g", 69_000],
  ["کنسرو", "Tabarrok", "تبرک", "رب گوجه‌فرنگی", "Tomato Paste", "۸۰۰ گرم", "800g", 98_000],
  ["چاشنی و سس", "Mahram", "مهرام", "سس کچاپ", "Ketchup", "۵۰۰ گرم", "500g", 64_000],
  ["چاشنی و سس", "Delpazir", "دلپذیر", "سس مایونز", "Mayonnaise", "۴۵۰ گرم", "450g", 72_000],
  ["چاشنی و سس", "Tabarrok", "تبرک", "زعفران سرگل", "Sargol Saffron", "۱ مثقال", "4.6g", 1_250_000],
  ["چاشنی و سس", "Golestan", "گلستان", "زردچوبه", "Turmeric", "۹۰ گرم", "90g", 58_000],
  ["چاشنی و سس", "Tabarrok", "تبرک", "مربای آلبالو", "Sour Cherry Jam", "۳۰۰ گرم", "300g", 79_000],
  ["چاشنی و سس", "Shahd Ayeen", "شهد آئین", "عسل طبیعی", "Natural Honey", "۹۰۰ گرم", "900g", 485_000],
  ["صبحانه", "Kalleh", "کاله", "کره بادام‌زمینی", "Peanut Butter", "۳۵۰ گرم", "350g", 165_000],
  ["صبحانه", "Nestle", "نستله", "کورن فلکس", "Corn Flakes", "۳۷۵ گرم", "375g", 189_000],
  ["صبحانه", "Telavang", "تلاونگ", "تخم‌مرغ", "Eggs", "۳۰ عددی", "30pcs", 335_000, true],
  ["صبحانه", "Ghandil", "قندیل", "قند شکسته", "Sugar Cubes", "۱ کیلوگرم", "1kg", 89_000],
  ["شوینده", "Golrang", "گلرنگ", "مایع ظرفشویی", "Dish Soap", "۷۵۰ گرم", "750g", 69_000, true],
  ["شوینده", "Pril", "پریل", "مایع ظرفشویی", "Dish Soap", "۷۵۰ گرم", "750g", 82_000],
  ["شوینده", "Barf", "برف", "پودر رختشویی دستی", "Hand Wash Powder", "۵۰۰ گرم", "500g", 61_000],
  ["شوینده", "Persil", "پرسیل", "پودر ماشین لباسشویی", "Machine Detergent", "۴ کیلوگرم", "4kg", 890_000],
  ["شوینده", "Ariel", "اریل", "مایع لباسشویی", "Liquid Detergent", "۲٫۷ لیتر", "2.7L", 645_000],
  ["شوینده", "Paknam", "پاکنام", "سفیدکننده غلیظ", "Bleach", "۴ لیتر", "4L", 115_000],
  ["شوینده", "Golrang", "گلرنگ", "مایع دستشویی", "Hand Soap", "۵۰۰ گرم", "500g", 58_000],
  ["بهداشتی", "Darugar", "داروگر", "شامپو کراتینه", "Keratin Shampoo", "۴۰۰ میلی‌لیتر", "400ml", 118_000],
  ["بهداشتی", "Head & Shoulders", "هد اند شولدرز", "شامپو ضدشوره", "Anti-dandruff Shampoo", "۴۰۰ میلی‌لیتر", "400ml", 315_000],
  ["بهداشتی", "Colgate", "کلگیت", "خمیردندان", "Toothpaste", "۱۰۰ میلی‌لیتر", "100ml", 98_000],
  ["بهداشتی", "Pooneh", "پونه", "خمیردندان گیاهی", "Herbal Toothpaste", "۱۰۰ گرم", "100g", 52_000],
  ["بهداشتی", "Tena", "تنا", "دستمال کاغذی", "Facial Tissue", "۱۰۰ برگ × ۵", "5x100", 175_000],
  ["بهداشتی", "Papia", "پاپیا", "دستمال توالت", "Toilet Paper", "۸ رول", "8 rolls", 135_000],
  ["بهداشتی", "Molfix", "مولفیکس", "پوشک بچه سایز ۴", "Baby Diapers Size 4", "۳۲ عددی", "32pcs", 520_000],
  ["بهداشتی", "Dafi", "دافی", "دستمال مرطوب", "Wet Wipes", "۷۰ عددی", "70pcs", 69_000],
  ["حبوبات", "Golestan", "گلستان", "عدس درشت", "Lentils", "۹۰۰ گرم", "900g", 138_000],
  ["حبوبات", "Golestan", "گلستان", "لوبیا قرمز", "Red Beans", "۹۰۰ گرم", "900g", 152_000],
  ["حبوبات", "Mahmood", "محمود", "نخود", "Chickpeas", "۹۰۰ گرم", "900g", 129_000],
  ["پروتئین", "Kalleh", "کاله", "سوسیس ۷۰٪", "70% Sausage", "۵۰۰ گرم", "500g", 245_000],
  ["پروتئین", "Solico", "سولیکو", "کالباس ۹۰٪", "90% Cold Cut", "۳۰۰ گرم", "300g", 265_000],
  ["پروتئین", "Sobhan", "سبحان", "فیله مرغ منجمد", "Frozen Chicken Fillet", "۹۰۰ گرم", "900g", 345_000],
  ["پروتئین", "Andisheh", "اندیشه", "گوشت چرخ‌کرده منجمد", "Frozen Ground Beef", "۵۰۰ گرم", "500g", 425_000],
  ["برنج", "Tabarrok", "تبرک", "برنج فجر", "Fajr Rice", "۵ کیلوگرم", "5kg", 980_000],
  ["چای", "Golestan", "گلستان", "چای سبز کیسه‌ای", "Green Tea Bags", "۲۵ عددی", "25pcs", 95_000],
  ["چای", "Ahmad", "احمد", "چای کیسه‌ای ارل گری", "Earl Grey Tea Bags", "۱۰۰ عددی", "100pcs", 345_000],
  ["روغن", "Ladan", "لادن", "روغن زیتون فرابکر", "Extra Virgin Olive Oil", "۵۰۰ میلی‌لیتر", "500ml", 420_000],
  ["لبنیات", "Mihan", "میهن", "بستنی وانیلی", "Vanilla Ice Cream", "۱ لیتر", "1L", 145_000],
  ["لبنیات", "Domino", "دومینو", "بستنی چوبی", "Ice Cream Bar", "۱ عدد", "1pc", 28_000],
  ["لبنیات", "Pegah", "پگاه", "شیر کاکائو", "Chocolate Milk", "۲۰۰ میلی‌لیتر", "200ml", 19_000],
  ["لبنیات", "Kalleh", "کاله", "ماست کم‌چرب", "Low-fat Yogurt", "۹۰۰ گرم", "900g", 74_000],
  ["لبنیات", "Mihan", "میهن", "پنیر پیتزا", "Pizza Cheese", "۱۸۰ گرم", "180g", 98_000],
  ["نوشیدنی", "Pepsi", "پپسی", "نوشابه پپسی", "Pepsi", "۱٫۵ لیتر", "1.5L", 49_000],
  ["نوشیدنی", "Ab Ali", "آب‌علی", "آب معدنی گازدار", "Sparkling Water", "۱ لیتر", "1L", 22_000],
  ["نوشیدنی", "Sunich", "سن‌ایچ", "آبمیوه انبه", "Mango Juice", "۱ لیتر", "1L", 82_000],
  ["نوشیدنی", "Hype", "هایپ", "نوشیدنی انرژی‌زا", "Energy Drink", "۲۵۰ میلی‌لیتر", "250ml", 45_000],
  ["تنقلات", "Minoo", "مینو", "کراکر نمکی", "Salted Crackers", "۲۵۰ گرم", "250g", 42_000],
  ["تنقلات", "Shirin Asal", "شیرین عسل", "تافی میوه‌ای", "Fruit Toffee", "۳۵۰ گرم", "350g", 89_000],
  ["تنقلات", "Pofak Namaki", "پفک نمکی", "پفک", "Cheese Puffs", "بزرگ", "Large", 38_000],
  ["تنقلات", "Golestan", "گلستان", "پسته اکبری شور", "Salted Akbari Pistachio", "۴۵۰ گرم", "450g", 1_150_000],
  ["کنسرو", "Behrouz", "بهروز", "کنسرو ذرت شیرین", "Sweet Corn", "۴۰۰ گرم", "400g", 72_000],
  ["کنسرو", "Shilan", "شیلان", "کنسرو ماهی ساردین", "Sardines", "۱۸۰ گرم", "180g", 85_000],
  ["چاشنی و سس", "Mahram", "مهرام", "سس فرانسوی", "French Dressing", "۴۵۰ گرم", "450g", 69_000],
  ["چاشنی و سس", "Golestan", "گلستان", "فلفل سیاه", "Black Pepper", "۷۵ گرم", "75g", 85_000],
  ["صبحانه", "Tabarrok", "تبرک", "مربای هویج", "Carrot Jam", "۳۰۰ گرم", "300g", 72_000],
  ["صبحانه", "Shirin Asal", "شیرین عسل", "شکلات صبحانه فندقی", "Hazelnut Spread", "۳۵۰ گرم", "350g", 198_000],
  ["شوینده", "Golrang", "گلرنگ", "شیشه پاک‌کن", "Glass Cleaner", "۵۰۰ میلی‌لیتر", "500ml", 54_000],
  ["شوینده", "Saftex", "سافتلن", "نرم‌کننده لباس", "Fabric Softener", "۱ لیتر", "1L", 98_000],
  ["بهداشتی", "Nivea", "نیوآ", "کرم مرطوب‌کننده", "Moisturizing Cream", "۱۵۰ میلی‌لیتر", "150ml", 265_000],
  ["بهداشتی", "Gillette", "ژیلت", "تیغ اصلاح ۴ عددی", "Razor 4-pack", "۴ عددی", "4pcs", 215_000],
  ["نان و غلات", "Zar", "زر", "رشته آش", "Ash Noodles", "۵۰۰ گرم", "500g", 46_000],
  ["نان و غلات", "Seeb", "سیب", "نان تست سبوس‌دار", "Whole-wheat Toast", "۵۰۰ گرم", "500g", 52_000],
  ["نان و غلات", "Zar", "زر", "آرد گندم", "Wheat Flour", "۹۰۰ گرم", "900g", 42_000],
  ["نان و غلات", "Golestan", "گلستان", "جو پرک", "Rolled Oats", "۴۵۰ گرم", "450g", 88_000],
];
for (const [sub, brand, brandFa, productFa, productEn, sizeFa, sizeEn, printed, popular] of GROCERIES) {
  // Online grocery offers sit at or a bit below the printed consumer price.
  add(
    {
      id: slug(`${brand} ${productEn} ${sizeEn}`),
      nameFa: `${productFa} ${brandFa} ${sizeFa}`,
      nameEn: `${brand} ${productEn} ${sizeEn}`,
      brand,
      brandFa,
      model: `${productEn} ${sizeEn}`,
      category: "grocery",
      subcategory: sub,
      barcode: ean13("626"),
      specs: { "وزن/حجم": sizeFa, "نوع": productFa },
      printedPrice: printed,
      popular,
    },
    printed * 0.94,
    { capAt: printed },
  );
}

const out = {
  _notice:
    "MOCK DATA — generated by scripts/generate-seed.ts for the hackathon demo. Product names are real brands, but ALL prices, sellers, barcodes and offers are invented.",
  generatedAt: "2026-10-21",
  count: products.length,
  products,
};

const file = join(process.cwd(), "src", "data", "mock", "products.json");
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, JSON.stringify(out, null, 1) + "\n", "utf8");
const byCat = products.reduce<Record<string, number>>((acc, p) => ((acc[p.category] = (acc[p.category] ?? 0) + 1), acc), {});
console.log(`Wrote ${products.length} mock products ->`, file, byCat);
