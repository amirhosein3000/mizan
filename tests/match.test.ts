import { describe, expect, it } from "vitest";
import { dice, matchConfidence, tokensMatch } from "@/lib/match";
import { MockPriceProvider } from "@/lib/price/mock-provider";

const provider = new MockPriceProvider();

describe("tokensMatch", () => {
  it("matches a number with its unit", () => {
    expect(tokensMatch("256", "256gb")).toBe(true);
  });
  it("does not confuse model numbers", () => {
    expect(tokensMatch("a5", "a56")).toBe(false);
    expect(tokensMatch("a56", "a36")).toBe(false);
  });
});

describe("dice", () => {
  it("is 1 for identical strings and low for unrelated ones", () => {
    expect(dice("galaxya56", "galaxya56")).toBe(1);
    expect(dice("galaxya56", "macbookair")).toBeLessThan(0.2);
  });
});

describe("MockPriceProvider.searchProducts", () => {
  it("finds the exact storage variant", async () => {
    const [top] = await provider.searchProducts("Samsung Galaxy A56 5G 256GB RAM 8GB");
    expect(top.product.id).toBe("samsung-galaxy-a56-5g-256gb-8gb");
  });

  it("handles Persian brand names and Persian digits", async () => {
    const results = await provider.searchProducts("گوشی سامسونگ A56 ۲۵۶ گیگ");
    expect(results[0].product.model).toContain("A56");
    expect(results[0].product.model).toContain("256GB");
  });

  it("tolerates OCR-style noise", async () => {
    const [top] = await provider.searchProducts("Redmi Note14 Pro 256");
    expect(top.product.nameEn).toContain("Redmi Note 14 Pro");
  });

  it("matches groceries by Persian name", async () => {
    const [top] = await provider.searchProducts("چای گلستان");
    expect(top.product.brand).toBe("Golestan");
    expect(top.product.subcategory).toBe("چای");
  });

  it("looks up barcodes exactly", async () => {
    const featured = await provider.listFeatured(1);
    const code = featured[0].barcode!;
    const results = await provider.searchProducts(code);
    expect(results[0].product.id).toBe(featured[0].id);
    expect(results[0].score).toBe(1);
  });

  it("is confident for a full model string and unsure for a partial one", async () => {
    expect(matchConfidence(await provider.searchProducts("Samsung Galaxy S25 Ultra 512GB RAM 12GB"))).toBe("high");
    expect(matchConfidence(await provider.searchProducts("Samsung Galaxy S25"))).not.toBe("high");
  });

  it("returns cheaper comparable alternatives in the same sub-category", async () => {
    const alts = await provider.getAlternatives("samsung-galaxy-a56-5g-256gb-8gb");
    expect(alts.length).toBeGreaterThan(0);
    for (const a of alts) expect(a.product.subcategory).toBe("گوشی موبایل");
  });
});
