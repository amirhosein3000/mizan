import { describe, expect, it } from "vitest";
import { simulateCall } from "@/lib/agent/call-sim";
import { parseIntent } from "@/lib/agent/intent";
import { categoryFit, coverage, ftsAnd, unaskedAccessory } from "@/lib/catalog/query";
import type { Offer, Shop } from "@/lib/catalog/types";
import { DEFAULT_CONTEXT } from "@/lib/shop/context";
import { rankShops } from "@/lib/shop/rank";

const tehran = (h: number, m = 0, day = 21) => Date.UTC(2026, 9, day, h, m) - 3.5 * 3600_000;

function shop(id: string, over: Partial<Shop> = {}): Shop {
  return {
    id,
    name: `shop ${id}`,
    nameReal: false,
    address: null,
    area: null,
    lat: 35.695,
    lon: 51.407,
    phone: "۰۲۱۱۲۳۴۵۶۷۸",
    instagram: null,
    website: null,
    categories: [],
    hours: [[[600, 1260]], [[600, 1260]], [[600, 1260]], [[600, 1260]], [[600, 1260]], [[600, 1260]], []],
    payments: [],
    installment: false,
    torobPay: "none",
    fastDelivery: null,
    mall: null,
    floor: null,
    unit: null,
    offerCount: 10,
    ...over,
  };
}

function offer(shopId: string, price: number | null, changedAt: number | null): Offer {
  return { productId: "p1", shopId, title: "x", description: null, price, changedAt, warranty: null, warrantyMonths: null };
}

describe("intent parsing", () => {
  it("splits product, budget, place and conditions", () => {
    const i = parseIntent("یه هدفون انکر زیر ۵ میلیون نزدیک جمهوری می‌خوام، قسطی");
    expect(i.query).toBe("هدفون انکر");
    expect(i.budgetMax).toBe(5_000_000);
    expect(i.place?.name).toContain("جمهوری");
    expect(i.installment).toBe(true);
  });
  it("reads ranges and 'near me'", () => {
    const i = parseIntent("دوربین مداربسته داهوا بین ۲ تا ۴ میلیون نزدیک من");
    expect(i.query).toBe("دوربین مداربسته داهوا");
    expect([i.budgetMin, i.budgetMax]).toEqual([2_000_000, 4_000_000]);
    expect(i.nearMe).toBe(true);
    expect(i.place).toBeNull();
  });
  it("reads open-now and visit time", () => {
    expect(parseIntent("گوشی سامسونگ A56 که الان باز باشه").openNow).toBe(true);
    expect(parseIntent("مبل تختخواب شو فردا عصر").when).toBe("tomorrow_evening");
  });
  it("treats a bare small number as millions", () => {
    expect(parseIntent("کفش ونس زیر 3").budgetMax).toBe(3_000_000);
  });
});

describe("catalog query helpers", () => {
  it("expands brand synonyms across scripts", () => {
    expect(ftsAnd("گوشی سامسونگ")).toContain('"samsung"*');
  });
  it("prefers exact words over prefixes", () => {
    expect(coverage("کفش", "کفش ونس")).toBe(1);
    expect(coverage("کفش", "کفشور استخر")).toBeCloseTo(0.6);
  });
  it("detects the category the shopper means", () => {
    expect(categoryFit("گوشی سامسونگ", "گوشی موبایل")).toBeGreaterThan(categoryFit("گوشی سامسونگ", "باتری گوشی موبایل"));
    expect(unaskedAccessory("گوشی سامسونگ", "کیف و کاور گوشی")).toBe(true);
    expect(unaskedAccessory("کاور گوشی سامسونگ", "کیف و کاور گوشی")).toBe(false);
  });
});

describe("shop ranking", () => {
  const now = tehran(15);
  const origin = { lat: 35.695, lon: 51.407, label: "x", source: "area" as const };

  it("explains the cheapest and nearest picks", () => {
    const r = rankShops(
      [
        { shop: shop("a", { lat: 35.695, lon: 51.4071 }), offer: offer("a", 4_000_000, now - 2 * 86_400_000) },
        { shop: shop("b", { lat: 35.71, lon: 51.43 }), offer: offer("b", 3_500_000, now - 2 * 86_400_000) },
      ],
      { ...DEFAULT_CONTEXT, origin },
      now,
    );
    const a = r.shops.find((s) => s.shop.id === "a")!;
    const b = r.shops.find((s) => s.shop.id === "b")!;
    expect(b.reasons.map((x) => x.text)).toContain("ارزون‌ترین");
    expect(a.reasons.map((x) => x.text)).toContain("نزدیک‌ترین");
  });

  it("hides shops that fail the shopper's conditions, and says why", () => {
    const r = rankShops(
      [
        { shop: shop("a", { installment: true, payments: [{ provider: "اسنپ‌پی", inPerson: true }] }), offer: offer("a", 1_000_000, now) },
        { shop: shop("b"), offer: offer("b", 900_000, now) },
      ],
      { ...DEFAULT_CONTEXT, installment: true },
      now,
    );
    expect(r.shops.map((s) => s.shop.id)).toEqual(["a"]);
    expect(r.hidden.installment).toBe(1);
  });

  it("lets a confirmed price beat a listed one", () => {
    const r = rankShops(
      [
        {
          shop: shop("a"),
          offer: offer("a", 5_000_000, now - 100 * 86_400_000),
          confirmation: { shopId: "a", productId: "p1", available: true, price: 4_800_000, at: now, source: "call" },
        },
      ],
      DEFAULT_CONTEXT,
      now,
    );
    expect(r.shops[0].price).toBe(4_800_000);
    expect(r.shops[0].priceSource).toBe("confirmed");
  });

  it("drops shops that said they're out of stock", () => {
    const r = rankShops(
      [{ shop: shop("a"), offer: offer("a", 1, now), confirmation: { shopId: "a", productId: "p1", available: false, price: null, at: now, source: "call" } }],
      DEFAULT_CONTEXT,
      now,
    );
    expect(r.shops).toHaveLength(0);
    expect(r.hidden.unavailable).toBe(1);
  });
});

describe("call simulation", () => {
  const product = { id: "p1", title: "هدفون بلوتوثی انکر Soundcore R50i | مشکی", price: { min: 3e6, median: 3.4e6, max: 4e6, count: 5 } };

  it("a closed shop doesn't pick up", () => {
    const s = simulateCall({ shop: shop("a"), product, offer: offer("a", 3.4e6, tehran(12)), asks: ["price"], at: tehran(23) });
    expect(s.result.outcome).toBe("closed");
    expect(s.result.available).toBeNull();
  });

  it("is deterministic for the same shop, product and day", () => {
    const input = { shop: shop("a"), product, offer: offer("a", 3.4e6, tehran(12)), asks: ["price", "hold"] as const, at: tehran(12) };
    const a = simulateCall({ ...input, asks: [...input.asks] });
    const b = simulateCall({ ...input, asks: [...input.asks], at: tehran(12, 30) });
    expect(a.result).toEqual({ ...b.result, holdUntil: a.result.holdUntil, closesAt: a.result.closesAt });
  });

  it("answers with a coherent result when it picks up", () => {
    // Try a few shops: every answered call has a price when available, and a timeline.
    for (const id of ["a", "b", "c", "d", "e", "f"]) {
      const s = simulateCall({ shop: shop(id), product, offer: offer(id, 3.4e6, tehran(12, 0, 19)), asks: ["price"], at: tehran(12) });
      expect(s.durationMs).toBeGreaterThan(0);
      expect(s.lines[0].who).toBe("system");
      if (s.result.outcome === "answered" && s.result.available) expect(s.result.price).toBeGreaterThan(0);
    }
  });
});

describe("shopkeeper answer from specs (no-key fallback)", () => {
  const specs: [string, string][] = [
    ["رنگ", "آبی, سفید, صورتی, مشکی"],
    ["نوع اتصال", "بی سیم"],
    ["نسخه بلوتوث", "5.3"],
  ];
  it("confirms a value the specs contain", async () => {
    const { specAnswer } = await import("@/lib/ai/shop-answer");
    expect(specAnswer("رنگ مشکی دارید؟", specs)).toContain("مشکی");
  });
  it("answers a spec key", async () => {
    const { specAnswer } = await import("@/lib/ai/shop-answer");
    expect(specAnswer("بلوتوث چنده؟", specs)).toContain("5.3");
  });
  it("stays silent when the specs don't say", async () => {
    const { specAnswer } = await import("@/lib/ai/shop-answer");
    expect(specAnswer("ارسال رایگان دارید؟", specs)).toBeNull();
  });
});

describe("shopStats", () => {
  it("ignores listed prices far below the product's trimmed minimum", async () => {
    const { shopStats } = await import("@/lib/agent/shops-service");
    const now = tehran(12);
    const ranked = rankShops(
      [
        { shop: shop("a"), offer: offer("a", 480_000, now), confirmation: null },
        { shop: shop("b"), offer: offer("b", 1_350_000, now), confirmation: null },
      ],
      DEFAULT_CONTEXT,
      now,
    );
    expect(shopStats(ranked).cheapest).toBe(480_000);
    expect(shopStats(ranked, 1_300_000).cheapest).toBe(1_350_000);
  });
});
