// Simulated phone call from the agent to a shop. The dataset's phone numbers are
// fake, so the shopkeeper's side is simulated — but grounded in the data: a shop
// that is closed per its hours doesn't pick up, a price that wasn't touched for
// months has likely moved, a shop that only declares the category is less likely
// to have the exact model. Deterministic per (shop, product, day) so a re-run
// tells the same story. Pure.
import type { Offer, PriceSummary, Shop } from "../catalog/types";
import { formatTomanShort, roundNice } from "../format";
import { freshnessWeight, priceFreshness } from "../shop/freshness";
import { hhmm, openStatus } from "../shop/hours";

export type Ask = "stock" | "price" | "installment" | "warranty" | "hold";

export const ASK_LABEL: Record<Ask, string> = {
  stock: "موجودی",
  price: "قیمت نهایی",
  installment: "خرید قسطی",
  warranty: "گارانتی",
  hold: "نگه‌داشتن کالا",
};

export type CallOutcome = "answered" | "no_answer" | "closed" | "busy";

export interface CallResult {
  outcome: CallOutcome;
  available: boolean | null;
  price: number | null;
  /** Compared with the listed price. */
  priceChange: "same" | "up" | "down" | "new" | null;
  installment: boolean | null;
  warranty: string | null;
  /** Epoch ms until which the shop keeps the item for the shopper. */
  holdUntil: number | null;
  /** Minutes since midnight the shop said it closes today. */
  closesAt: number | null;
  restockDays: number | null;
  /** One-line Persian summary for cards. */
  summary: string;
}

export interface ScriptLine {
  /** ms after the call started */
  t: number;
  who: "agent" | "shop" | "system";
  text: string;
}

export interface CallScript {
  lines: ScriptLine[];
  durationMs: number;
  result: CallResult;
}

export interface CallInput {
  shop: Shop;
  product: { id: string; title: string; price: PriceSummary | null };
  offer: Offer | null;
  asks: Ask[];
  question?: string | null;
  /** Call start, epoch ms. */
  at: number;
  /** When the shopper plans to arrive (for the hold request). */
  visitAt?: number | null;
}

// ---------- seeded randomness ----------
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** «هدفون بلوتوثی انکر Soundcore R50i» — the part before «|», at most 7 words. */
export function shortTitle(title: string): string {
  return title.split("|")[0].trim().split(/\s+/).slice(0, 7).join(" ");
}

const toman = (n: number) => `${formatTomanShort(n)} تومن`;

export function simulateCall(input: CallInput): CallScript {
  const { shop, product, offer, at } = input;
  const asks = new Set<Ask>(["stock", ...input.asks]);
  const day = Math.floor(at / 86_400_000);
  const rand = rng(`${shop.id}|${product.id}|${day}`);
  const lines: ScriptLine[] = [];
  let t = 0;
  // Pacing: brisk enough for a demo, slow enough to read along.
  const say = (who: ScriptLine["who"], text: string, gap = 1350) => {
    t += gap + Math.round(rand() * 500);
    lines.push({ t, who, text });
  };

  lines.push({ t: 0, who: "system", text: `در حال شماره‌گیری ${shop.phone ?? "فروشگاه"}…` });
  const status = openStatus(shop.hours, at);
  const empty = (outcome: CallOutcome, summary: string): CallResult => ({
    outcome,
    available: null,
    price: null,
    priceChange: null,
    installment: null,
    warranty: null,
    holdUntil: null,
    closesAt: null,
    restockDays: null,
    summary,
  });

  // ---- doesn't pick up ----
  if (status.state === "closed") {
    say("system", "بوق آزاد… کسی جواب نمی‌ده.", 1600);
    say("system", `طبق ساعت کاری ثبت‌شده الان بسته‌ست (${status.label.replace("بسته • ", "")}).`, 4200);
    return { lines, durationMs: t + 600, result: empty("closed", "بسته بود؛ جواب نداد") };
  }
  const pickUp = rand();
  if (pickUp < 0.04) {
    say("system", "بوق اشغال.", 1500);
    return { lines, durationMs: t + 600, result: empty("busy", "خط اشغال بود") };
  }
  if (pickUp > (status.state === "unknown" ? 0.82 : 0.93)) {
    say("system", "بوق آزاد… کسی جواب نمی‌ده.", 1600);
    say("system", "بعد از ۸ بوق قطع شد.", 4200);
    return { lines, durationMs: t + 600, result: empty("no_answer", "جواب نداد") };
  }

  // ---- conversation ----
  const name = shortTitle(product.title);
  say("shop", `الو، بفرمایید. ${shop.nameReal ? shop.name : "فروشگاه"} در خدمتم.`, 2200);
  say("agent", "سلام، وقتتون بخیر. میزان هستم، دستیار خرید؛ از طرف یکی از مشتری‌ها تماس می‌گیرم.");
  say("agent", `«${name}» موجود دارید؟`, 1100);

  const fresh = freshnessWeight(priceFreshness(offer?.changedAt, at));
  const pAvail = offer ? 0.55 + 0.4 * fresh : 0.35;
  const available = rand() < pAvail;

  const result: CallResult = {
    outcome: "answered",
    available,
    price: null,
    priceChange: null,
    installment: null,
    warranty: null,
    holdUntil: null,
    closesAt: status.state === "open" ? status.closesAt ?? null : null,
    restockDays: null,
    summary: "",
  };

  if (!available) {
    say("shop", rand() < 0.5 ? "نه متأسفانه، فعلاً تموم کردیم." : "این مدل رو الان نداریم.");
    say("agent", "کی دوباره میارید؟");
    const restock = [2, 3, 7, 10][Math.floor(rand() * 4)];
    result.restockDays = restock;
    say("shop", restock <= 3 ? `احتمالاً ${restock === 2 ? "پس‌فردا" : "تا سه روز دیگه"} میاد.` : "شاید هفته‌ی بعد؛ قول نمی‌دم.");
    say("agent", "ممنون از وقتتون، خدانگهدار.");
    result.summary = `ناموجود؛ ${restock <= 3 ? "تا چند روز دیگه میاد" : "شاید هفته‌ی بعد"}`;
    return { lines, durationMs: t + 900, result };
  }

  say("shop", rand() < 0.7 ? "بله، موجوده." : "آره داریم، چندتا بیشتر نمونده.");

  // Price: fresh listings mostly hold; old ones drift up (Tehran prices move fast).
  const listed = offer?.price ?? null;
  const ref = listed ?? product.price?.median ?? null;
  if (ref) {
    const f = priceFreshness(offer?.changedAt, at);
    let factor = 1;
    const roll = rand();
    if (f === "fresh") factor = roll < 0.7 ? 1 : 1 + (rand() * 0.05 - 0.02);
    else if (f === "recent") factor = roll < 0.5 ? 1 : 1 + rand() * 0.06;
    else factor = 1 + 0.03 + rand() * 0.12;
    if (!listed) factor = 0.92 + rand() * 0.16;
    const price = factor === 1 && listed ? listed : roundNice(ref * factor);
    result.price = price;
    result.priceChange = !listed ? "new" : price === listed ? "same" : price > listed ? "up" : "down";
    say("agent", listed ? `قیمت نهاییش چنده؟ روی ترب ${toman(listed)} ثبت کردید.` : "قیمتش چنده؟");
    say(
      "shop",
      result.priceChange === "same"
        ? `همونه، ${toman(price)}.`
        : result.priceChange === "up"
          ? `الان ${toman(price)} شده؛ قیمت‌ها یه کم بالا رفته.`
          : result.priceChange === "down"
            ? `${toman(price)} حساب می‌کنیم؛ یه کم تخفیف خورده.`
            : `${toman(price)}.`,
    );
  }

  if (asks.has("installment")) {
    say("agent", "قسطی هم می‌فروشید؟");
    if (shop.installment) {
      result.installment = true;
      say("shop", `بله، با ${shop.payments.map((p) => p.provider).slice(0, 3).join(" و ")} می‌شه قسطی برداشت.`);
    } else {
      result.installment = false;
      say("shop", "نه، فقط نقد و کارت‌خوان.");
    }
  }

  if (asks.has("warranty")) {
    say("agent", "گارانتیش چیه؟");
    const w = offer?.warranty ?? (rand() < 0.5 ? "۱۸ ماه گارانتی شرکتی" : null);
    result.warranty = w ?? "فقط ضمانت اصالت";
    say("shop", w ? `${w} داره.` : "گارانتی نداره، فقط ضمانت اصالت و سلامت کالا.");
  }

  if (asks.has("hold")) {
    const arrive = Math.max(input.visitAt ?? at + 3600_000, at + 30 * 60_000);
    const arriveMin = (((Math.floor((arrive + 3.5 * 3600_000) / 60_000)) % 1440) + 1440) % 1440;
    const closesAt = result.closesAt ?? (status.state === "unknown" ? 20 * 60 : null);
    say("agent", `اگه تا ساعت ${hhmm(Math.ceil(arriveMin / 30) * 30)} بیان، براشون نگه می‌دارید؟`);
    if (rand() < 0.75) {
      const until = Math.max(arrive + 60 * 60_000, at + 90 * 60_000);
      result.holdUntil = until;
      const untilMin = (((Math.floor((until + 3.5 * 3600_000) / 60_000)) % 1440) + 1440) % 1440;
      say("shop", `باشه، تا ساعت ${hhmm(Math.round(untilMin / 30) * 30)} به اسم «مشتری میزان» کنار می‌ذارم.`);
    } else {
      say("shop", "نگه نمی‌داریم، ولی فعلاً موجودی هست؛ زودتر بیان.");
    }
    if (closesAt && status.state === "unknown") {
      result.closesAt = closesAt;
      say("shop", `ما تا ${hhmm(closesAt)} هستیم.`, 1200);
    }
  }

  if (input.question?.trim()) {
    say("agent", input.question.trim());
    say("shop", rand() < 0.6 ? "بله، حتماً." : "باید ببینم؛ حضوری که اومدن هماهنگ می‌کنیم.");
  }

  say("agent", "خیلی ممنون، روزتون خوش.");
  say("shop", "خواهش می‌کنم، منتظرتونیم.", 1300);

  const parts = ["موجوده"];
  if (result.price) {
    parts.push(
      result.priceChange === "up"
        ? `قیمت شده ${toman(result.price)}`
        : result.priceChange === "down"
          ? `${toman(result.price)} (ارزون‌تر شده)`
          : toman(result.price),
    );
  }
  if (result.holdUntil) parts.push("نگه می‌داره");
  result.summary = parts.join(" • ");
  return { lines, durationMs: t + 900, result };
}
