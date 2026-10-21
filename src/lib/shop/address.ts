// Pull the parts a shopper needs at the door out of a free-text Tehran address:
// the mall / passage name, the floor and the unit. Pure; used by the catalog
// build script and the UI.
import { toFaDigits } from "../format";

export interface AddressParts {
  /** «پاساژ علاءالدین ۲», «مجتمع تجاری پارس» … */
  mall: string | null;
  /** «همکف», «۶», «دوم» … (without the word «طبقه») */
  floor: string | null;
  /** «واحد ۶۲۲», «پلاک ۲۵», «غرفه ۱۲» */
  unit: string | null;
}

const MALL_RE = /(پاساژ|مجتمع(?:\s*تجاری)?|مرکز\s*(?:تجاری|خرید)|بازار(?:چه)?|تیمچه|سرای|سرا|برج\s*تجاری|گالری)\s*[^،,]*/;
const FLOOR_WORDS = "همکف|زیرهمکف|زیر\s*همکف|منفی\s*[\d۰-۹]+|اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم|بالا|پایین|زیرزمین|[\d۰-۹٠-٩]+";
const FLOOR_RE = new RegExp(`طبقه\\s*(${FLOOR_WORDS})`);
const UNIT_RE = /(واحد|غرفه|پلاک|مغازه)\s*([\d۰-۹٠-٩]+(?:\s*[/و-]\s*[\d۰-۹٠-٩]+)?)/;

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function parseAddress(address: string): AddressParts {
  const a = address ?? "";
  const mallMatch = a.match(MALL_RE);
  let mall = mallMatch ? clean(mallMatch[0]) : null;
  // "بازار موبایل" etc. are fine; a bare keyword with nothing after it is not a name.
  if (mall && mall.split(" ").length < 2) mall = null;
  if (mall) mall = toFaDigits(mall);
  const floorMatch = a.match(FLOOR_RE);
  const floor = floorMatch ? toFaDigits(clean(floorMatch[1])) : null;
  // Prefer «واحد/غرفه» over «پلاک» when both exist (پلاک is often the building number).
  const units = [...a.matchAll(new RegExp(UNIT_RE, "g"))];
  const best = units.find((u) => u[1] !== "پلاک") ?? units[0];
  const unit = best ? `${best[1]} ${toFaDigits(best[2].replace(/\s+/g, ""))}` : null;
  return { mall, floor, unit };
}

/** «طبقه ۶ • واحد ۶۲۲» — empty string when nothing is known. */
export function floorUnitLabel(p: Pick<AddressParts, "floor" | "unit">): string {
  return [p.floor ? `طبقه ${p.floor}` : null, p.unit].filter(Boolean).join(" • ");
}
