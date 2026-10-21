// "Ask Mizan" chat about one product. Grounded ONLY in our data: the product,
// the Tehran shops that list it (ranked for this shopper), call confirmations
// and alternatives.
import "server-only";
import type { ProductDetail } from "@/lib/catalog";
import type { ProductWithStats } from "@/lib/agent/shops-service";
import { formatToman } from "@/lib/format";
import { getLLM, type ChatMessage } from "@/lib/llm";
import { SYSTEM_PROMPT } from "@/lib/persona";
import { formatDistance } from "@/lib/shop/geo";
import type { RankedShop } from "@/lib/shop/rank";
import { CHECKLISTS, computeVerdict, negotiationLine } from "@/lib/verdict";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ProductContext {
  product: ProductDetail;
  shops: RankedShop[];
  similar: ProductWithStats[];
  storePrice?: number | null;
}

function shopLine(s: RankedShop): string {
  const parts = [
    s.shop.name,
    s.price ? `${s.priceSource === "confirmed" ? "confirmed by call" : "listed"} ${s.price} Toman` : "no price listed",
    s.distanceM !== null ? `distance ${Math.round(s.distanceM)} m` : null,
    s.status.label,
    [s.shop.mall, s.shop.floor ? `floor ${s.shop.floor}` : null, s.shop.unit].filter(Boolean).join(", ") || s.shop.address,
    s.shop.installment ? `installment: ${s.shop.payments.map((p) => p.provider).join("/")}` : null,
    s.offer?.warranty ? `warranty: ${s.offer.warranty}` : null,
  ];
  return `- ${parts.filter(Boolean).join(" | ")}`;
}

function contextBlock(ctx: ProductContext): string {
  const { product, shops, similar, storePrice } = ctx;
  const lines = [
    `Product: ${product.title} (category: ${product.category}${product.brand ? `, brand: ${product.brand}` : ""})`,
    `Specs: ${product.specs.slice(0, 15).map(([k, v]) => `${k}: ${v}`).join("، ")}`,
  ];
  if (product.price) {
    lines.push(
      `Listed prices across ${product.price.count} Tehran shops (Toman): min ${product.price.min}, median ${product.price.median}, max ${product.price.max}. Listed ≠ confirmed; stock is unknown unless confirmed.`,
    );
  }
  if (shops.length) lines.push(`Best shops for this shopper (ranked):\n${shops.slice(0, 6).map(shopLine).join("\n")}`);
  if (storePrice) lines.push(`In-store asking price the shopper sees right now: ${storePrice} Toman`);
  if (similar.length) {
    lines.push(`Alternatives: ${similar.slice(0, 4).map((a) => `${a.product.title} (median ${a.product.price?.median ?? "?"} Toman, ${a.stats.shops} shops)`).join("; ")}`);
  }
  return lines.join("\n");
}

export async function answerProductQuestion(ctx: ProductContext, turns: ChatTurn[]): Promise<string> {
  const llm = getLLM();
  if (llm.mode === "mock") return mockAnswer(ctx, turns[turns.length - 1]?.content ?? "");
  const messages: ChatMessage[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nDATA:\n${contextBlock(ctx)}` },
    ...turns.slice(-10).map((t) => ({ role: t.role, content: t.content }) as ChatMessage),
  ];
  return (await llm.chat(messages, { temperature: 0.4, maxTokens: 500 })).trim();
}

// ---------------- MOCK ----------------
// Keyword-routed answers built from the same real data, so the demo feels
// grounded with zero API keys.

function where(s: RankedShop): string {
  return [s.shop.mall, s.shop.floor ? `طبقه ${s.shop.floor}` : null, s.shop.unit].filter(Boolean).join("، ") || s.shop.address || "";
}

function mockAnswer(ctx: ProductContext, question: string): string {
  const { product, shops, similar, storePrice } = ctx;
  const q = question.replace(/[يى]/g, "ی").replace(/ك/g, "ک");
  const summary = product.price;
  const top = shops[0];

  if (/کجا|نزدیک|فروشگاه|مغازه|آدرس|برم/.test(q)) {
    if (!shops.length) return "تو داده‌های ترب فروشگاه حضوری‌ای که این مدل رو ثبت کرده باشه پیدا نکردم. جایگزین‌ها رو ببین یا بذار به فروشگاه‌های هم‌دسته زنگ بزنم.";
    const list = shops
      .slice(0, 3)
      .map((s) => `• ${s.shop.name}${s.price ? ` — ${formatToman(s.price)}` : ""}${s.distanceM !== null ? `، ${formatDistance(s.distanceM)}` : ""}، ${s.status.label}\n  ${where(s)}`)
      .join("\n");
    return `بهترین گزینه‌ها برای تو:\n${list}\nبخوای، به همین‌ها زنگ می‌زنم و موجودی و قیمت رو تأیید می‌کنم.`;
  }
  if (/قسط|اقساط|ترب ?پی|اسنپ/.test(q)) {
    const inst = shops.filter((s) => s.shop.installment);
    if (!inst.length) return "هیچ‌کدوم از فروشگاه‌هایی که این کالا رو ثبت کردن، خرید قسطی اعلام نکردن. می‌تونم موقع تماس دوباره بپرسم.";
    return `این‌ها قسطی هم می‌فروشن:\n${inst
      .slice(0, 3)
      .map((s) => `• ${s.shop.name}: ${s.shop.payments.map((p) => `${p.provider}${p.inPerson ? " (حضوری)" : ""}`).join("، ")}`)
      .join("\n")}`;
  }
  if (/گارانتی|اصل|تقلب|فیک|رجیستر|همتا|چک کنم|نکته/.test(q)) {
    return `قبل از پرداخت این‌ها رو چک کن:\n• ${CHECKLISTS[product.kind].slice(0, 3).join("\n• ")}`;
  }
  if (/چونه|تخفیف|کم کن|بگم/.test(q) && summary) {
    const v = computeVerdict(storePrice ?? summary.median, summary);
    return `اینو بهش بگو:\n«${negotiationLine(v, summary)}»`;
  }
  if (/قیمت|چند|گرون|ارزون|بخرم|ارزش/.test(q) && summary) {
    const base = `فروشگاه‌های تهران روی ترب از ${formatToman(summary.min)} تا ${formatToman(summary.max)} ثبتش کردن؛ قیمت معمول حدود ${formatToman(summary.median)}ه. این‌ها قیمت ثبت‌شده‌ان، نه تأییدشده.`;
    if (storePrice) {
      const v = computeVerdict(storePrice, summary);
      return `${base}\n${v.title} — ${v.reason}`;
    }
    return top?.price ? `${base}\nارزون‌ترین گزینه‌ی مناسب تو: ${top.shop.name} با ${formatToman(top.price)}.` : base;
  }
  if (/مشخصات|باتری|دوربین|رم|حافظه|صفحه|پردازنده|ظرفیت|وزن|سایز|رنگ/.test(q)) {
    if (!product.specs.length) return "مشخصات فنی این کالا تو داده‌ها ثبت نشده.";
    return `مشخصات ${product.title.split("|")[0].trim()}:\n${product.specs.slice(0, 6).map(([k, v]) => `• ${k}: ${v}`).join("\n")}`;
  }
  if (/جایگزین|بهتر|مقایسه|مشابه|ارزون‌تر|پیشنهاد/.test(q)) {
    if (!similar.length) return "جایگزین نزدیکی تو داده‌ها پیدا نکردم.";
    return `این‌ها هم‌رده‌ن:\n${similar
      .slice(0, 3)
      .map((a) => `• ${a.product.title.split("|")[0].trim()}${a.product.price ? ` — حدود ${formatToman(a.product.price.median)}` : ""} (${a.stats.shops} فروشگاه)`)
      .join("\n")}`;
  }
  return `می‌تونی بپرسی: «نزدیک‌ترین فروشگاه کجاست؟»، «قسطی کجا می‌فروشن؟»، «چی رو چک کنم؟» یا «جایگزین ارزون‌تر چی داره؟»`;
}
