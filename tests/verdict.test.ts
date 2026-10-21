import { describe, expect, it } from "vitest";
import { computeVerdict, negotiationLine } from "@/lib/verdict";
import type { PriceSummary } from "@/lib/price/types";

const summary: PriceSummary = { min: 30_000_000, median: 34_000_000, max: 40_000_000, mean: 34_500_000, count: 8 };

describe("computeVerdict", () => {
  it("calls a price at or below the median a good deal", () => {
    const v = computeVerdict(33_000_000, summary);
    expect(v.level).toBe("good");
    expect(v.diffFromMedian).toBe(-1_000_000);
    expect(v.suspiciouslyCheap).toBe(false);
  });

  it("allows a small margin above median as still good", () => {
    expect(computeVerdict(34_600_000, summary).level).toBe("good"); // +1.8%
  });

  it("calls up to 10% above median fair", () => {
    const v = computeVerdict(36_500_000, summary); // +7.4%
    expect(v.level).toBe("fair");
    expect(v.targetPrice).toBeGreaterThanOrEqual(summary.min);
    expect(v.targetPrice).toBeLessThan(36_500_000);
  });

  it("calls more than 10% above median overpriced", () => {
    const v = computeVerdict(39_000_000, summary);
    expect(v.level).toBe("high");
    expect(v.diffFromMedian).toBe(5_000_000);
    expect(v.title).toBe("گرونه!");
  });

  it("flags prices far below every online offer as suspicious", () => {
    const v = computeVerdict(22_000_000, summary);
    expect(v.level).toBe("good");
    expect(v.suspiciouslyCheap).toBe(true);
  });

  it("flags grocery prices above the printed consumer price", () => {
    const grocery: PriceSummary = { min: 420_000, median: 440_000, max: 465_000, mean: 441_000, count: 6 };
    const v = computeVerdict(470_000, grocery, { printedPrice: 465_000 });
    expect(v.abovePrintedPrice).toBe(true);
    expect(v.level).toBe("high");
  });

  it("target prices are rounded to numbers people say", () => {
    const v = computeVerdict(39_123_456, summary);
    expect(v.targetPrice % 100_000).toBe(0);
  });

  it("produces a negotiation line that quotes the target in Persian digits", () => {
    const v = computeVerdict(39_000_000, summary);
    const line = negotiationLine(v, summary);
    expect(line).toMatch(/[۰-۹]/);
    expect(line).not.toMatch(/[0-9]/);
  });
});
