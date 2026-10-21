import { describe, expect, it } from "vitest";
import { formatToman, formatTomanShort, parsePrice, toEnDigits, toFaDigits } from "@/lib/format";
import { normalizeText } from "@/lib/text";

describe("format", () => {
  it("formats Toman with Persian digits and separators", () => {
    expect(formatToman(1_234_567)).toBe("۱٬۲۳۴٬۵۶۷ تومان");
  });
  it("formats short prices", () => {
    expect(formatTomanShort(34_500_000)).toBe("۳۴٫۵ میلیون");
    expect(formatTomanShort(850_000)).toBe("۸۵۰ هزار");
  });
  it("round-trips digits", () => {
    expect(toEnDigits(toFaDigits("0123456789"))).toBe("0123456789");
  });
});

describe("parsePrice", () => {
  it.each([
    ["۳۴٬۵۰۰٬۰۰۰", 34_500_000],
    ["34,500,000", 34_500_000],
    ["۳۵ میلیون", 35_000_000],
    ["۲٫۵ میلیون", 2_500_000],
    ["850 هزار", 850_000],
    ["۴۵۰٬۰۰۰ ریال", 45_000],
  ])("%s -> %d", (input, expected) => {
    expect(parsePrice(input)).toBe(expected);
  });
  it("rejects junk", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("سلام")).toBeNull();
  });
});

describe("normalizeText", () => {
  it("unifies Arabic and Persian letters and digits", () => {
    expect(normalizeText("كيك ۱۲۳")).toBe("کیک 123");
  });
});
