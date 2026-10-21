// "Ask about this product" chat. Grounded in our own product + price data.
import "server-only";
import { getLLM, type ChatMessage } from "@/lib/llm";
import { formatNumber, formatToman } from "@/lib/format";
import { SYSTEM_PROMPT } from "@/lib/persona";
import { CHECKLISTS, computeVerdict, negotiationLine } from "@/lib/verdict";
import type { PriceSummary, Product, ProductWithSummary } from "@/lib/price";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ProductContext {
  product: Product;
  summary: PriceSummary | null;
  alternatives: ProductWithSummary[];
  storePrice?: number | null;
}

function contextBlock(ctx: ProductContext): string {
  const { product, summary, alternatives, storePrice } = ctx;
  const lines = [
    `Product: ${product.nameFa} (${product.nameEn})`,
    `Category: ${product.subcategory}`,
    `Specs: ${Object.entries(product.specs).map(([k, v]) => `${k}: ${v}`).join("، ")}`,
  ];
  if (product.printedPrice) lines.push(`Printed consumer price on package: ${product.printedPrice} Toman`);
  if (summary) {
    lines.push(
      `Online prices (Toman): min ${summary.min}, median ${summary.median}, max ${summary.max}, sellers ${summary.count}, cheapest seller ${summary.cheapestSeller}`,
    );
  }
  if (storePrice) lines.push(`In-store asking price: ${storePrice} Toman`);
  if (alternatives.length) {
    lines.push(
      `Alternatives: ${alternatives
        .map((a) => `${a.product.nameFa} (median ${a.summary?.median ?? "?"} Toman)`)
        .join("; ")}`,
    );
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
  return (await llm.chat(messages, { temperature: 0.5, maxTokens: 500 })).trim();
}

// ---------------- MOCK ----------------
// Keyword-routed answers that still use the real (mock) data, so the demo
// feels grounded even with zero API keys.

function mockAnswer(ctx: ProductContext, question: string): string {
  const { product, summary, alternatives, storePrice } = ctx;
  const q = question.replace(/[يى]/g, "ی").replace(/ك/g, "ک");
  const checklist = CHECKLISTS[product.category];

  if (/گارانتی|اصل|تقلب|فیک|رجیستر|همتا|چک کنم|نکته/.test(q)) {
    return `قبل از پرداخت این‌ها رو چک کن:\n• ${checklist.slice(0, 3).join("\n• ")}`;
  }
  if (/چونه|تخفیف|کم کن|بگم|فروشنده/.test(q) && summary) {
    const v = computeVerdict(storePrice ?? summary.median, summary, { printedPrice: product.printedPrice });
    return `اینو بهش بگو:\n«${negotiationLine(v, summary)}»\nبا لبخند بگو و آماده باش اگه کوتاه نیومد، بری سراغ گزینه‌ی بعدی 😉`;
  }
  if (/قیمت|چند|گرون|ارزون|بخرم|بخرم؟|ارزش/.test(q) && summary) {
    const base = `آنلاین از ${formatToman(summary.min)} تا ${formatToman(summary.max)} پیدا میشه؛ قیمت معمولش حدود ${formatToman(summary.median)} پیش ${formatNumber(summary.count)} فروشنده‌ست.`;
    if (storePrice) {
      const v = computeVerdict(storePrice, summary, { printedPrice: product.printedPrice });
      return `${base}\n${v.title} — ${v.reason}`;
    }
    return `${base}\nقیمت مغازه رو بگو تا بهت بگم می‌ارزه یا نه.`;
  }
  if (/مشخصات|باتری|دوربین|رم|حافظه|صفحه|پردازنده|ظرفیت|حجم|وزن/.test(q)) {
    const specs = Object.entries(product.specs)
      .slice(0, 5)
      .map(([k, v]) => `• ${k}: ${v}`)
      .join("\n");
    return `مشخصات اصلی ${product.nameFa}:\n${specs}`;
  }
  if (/جایگزین|بهتر|مقایسه|مشابه|ارزون‌تر|پیشنهاد/.test(q)) {
    if (!alternatives.length) return "فعلاً جایگزین نزدیکی تو داده‌هام پیدا نکردم.";
    const list = alternatives
      .slice(0, 3)
      .map((a) => `• ${a.product.nameFa}${a.summary ? ` — حدود ${formatToman(a.summary.median)}` : ""}`)
      .join("\n");
    return `این‌ها هم‌رده‌ن و ارزش نگاه کردن دارن:\n${list}`;
  }
  return `${product.nameFa} رو داری می‌بینی. ${
    summary ? `قیمت معمول آنلاینش حدود ${formatToman(summary.median)} است. ` : ""
  }می‌تونی بپرسی: «ارزش خرید داره؟»، «چی رو چک کنم؟» یا «چی بگم تخفیف بده؟»`;
}
