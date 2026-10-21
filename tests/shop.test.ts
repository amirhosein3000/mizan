import { describe, expect, it } from "vitest";
import { parseAddress } from "@/lib/shop/address";
import { ageLabel, priceFreshness } from "@/lib/shop/freshness";
import { distanceM, inTrafficZone, travelEstimate } from "@/lib/shop/geo";
import { hhmm, openStatus, tehranClock, type WeekHours } from "@/lib/shop/hours";
import { contextFromParams, contextToParams, DEFAULT_CONTEXT } from "@/lib/shop/context";

/** 2026-10-21 is a Wednesday. Tehran = UTC+03:30. */
const tehran = (h: number, m = 0, day = 21) => Date.UTC(2026, 9, day, h, m) - 3.5 * 3600_000;

// sat..fri: 10:00-19:00 weekdays, Thursday until 14:00, Friday closed.
const WEEK: WeekHours = [
  [[600, 1140]],
  [[600, 1140]],
  [[600, 1140]],
  [[600, 1140]],
  [[600, 1140]],
  [[600, 840]],
  [],
];

describe("hours (Tehran time)", () => {
  it("reads the Tehran clock", () => {
    expect(tehranClock(tehran(15, 30))).toEqual({ day: 4, minute: 15 * 60 + 30 }); // Wednesday
  });
  it("open with closing time", () => {
    const s = openStatus(WEEK, tehran(15));
    expect(s.state).toBe("open");
    expect(s.closesAt).toBe(1140);
    expect(s.label).toBe(`باز تا ${hhmm(1140)}`);
  });
  it("warns when closing soon", () => {
    const s = openStatus(WEEK, tehran(18, 40));
    expect(s.closesIn).toBe(20);
    expect(s.label).toContain("دقیقه دیگه می‌بنده");
  });
  it("closed in the evening, opens tomorrow", () => {
    const s = openStatus(WEEK, tehran(21));
    expect(s.state).toBe("closed");
    expect(s.opensAt).toEqual({ dayOffset: 1, minute: 600 });
    expect(s.label).toContain("فردا");
  });
  it("skips a closed Friday", () => {
    const s = openStatus(WEEK, tehran(20, 0, 22)); // Thursday evening
    expect(s.state).toBe("closed");
    expect(s.opensAt?.dayOffset).toBe(2); // Saturday
  });
  it("unknown when not declared", () => {
    expect(openStatus(null).state).toBe("unknown");
  });
});

describe("address parsing", () => {
  it("extracts passage, floor and unit", () => {
    expect(parseAddress("خیابان جمهوری، نبش شیخ هادی، پاساژ علالدین 2، طبقه 6، واحد 622")).toEqual({
      mall: "پاساژ علالدین ۲",
      floor: "۶",
      unit: "واحد ۶۲۲",
    });
  });
  it("prefers unit over plaque, reads word floors", () => {
    const a = parseAddress("لاله زار جنوبی، پاساژ اتحادیه، طبقه سوم، پلاک ۲۴، واحد ۱");
    expect(a.floor).toBe("سوم");
    expect(a.unit).toBe("واحد ۱");
  });
  it("handles a street shop with only a plaque", () => {
    expect(parseAddress("خیابان سعدی جنوبی، پلاک ۳۲۸")).toEqual({ mall: null, floor: null, unit: "پلاک ۳۲۸" });
  });
});

describe("geo", () => {
  it("measures distance", () => {
    const d = distanceM({ lat: 35.7009, lon: 51.3911 }, { lat: 35.6949, lon: 51.4071 });
    expect(d).toBeGreaterThan(1400);
    expect(d).toBeLessThan(1700);
  });
  it("walks short trips and drives long ones", () => {
    expect(travelEstimate(500).mode).toBe("walk");
    expect(travelEstimate(6000).mode).toBe("car");
  });
  it("knows central Tehran is in the traffic zone", () => {
    expect(inTrafficZone({ lat: 35.6949, lon: 51.4071 })).toBe(true);
    expect(inTrafficZone({ lat: 35.8046, lon: 51.4336 })).toBe(false); // Tajrish
  });
});

describe("price freshness", () => {
  const now = tehran(12);
  it("grades by age", () => {
    expect(priceFreshness(now - 3 * 86_400_000, now)).toBe("fresh");
    expect(priceFreshness(now - 20 * 86_400_000, now)).toBe("recent");
    expect(priceFreshness(now - 60 * 86_400_000, now)).toBe("stale");
    expect(priceFreshness(now - 400 * 86_400_000, now)).toBe("old");
    expect(priceFreshness(null, now)).toBe("unknown");
  });
  it("labels in Persian", () => {
    expect(ageLabel(now - 5 * 86_400_000, now)).toBe("۵ روز پیش");
  });
});

describe("shopper context <-> params", () => {
  it("round-trips", () => {
    const ctx = {
      ...DEFAULT_CONTEXT,
      origin: { lat: 35.7, lon: 51.4, label: "فردوسی", source: "area" as const },
      radiusKm: 2,
      installment: true,
      budgetMax: 5_000_000,
    };
    const p = contextToParams(ctx);
    const back = contextFromParams((k) => p[k] ?? null);
    expect(back).toEqual(ctx);
  });
});
