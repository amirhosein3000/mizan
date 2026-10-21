// Opening hours in Tehran local time. Pure; runs on server and client.
// Week layout matches the dataset: index 0 = Saturday … 6 = Friday.
// Each day: null = not declared, [] = closed all day, [[openMin, closeMin], …].
import { toFaDigits } from "../format";

export type WeekHours = (number[][] | null)[];

export const DAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

const WEEKDAY_INDEX: Record<string, number> = { Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 };

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tehran",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Day index (0 = Saturday) and minutes since midnight in Tehran for a timestamp. */
export function tehranClock(at: number | Date = Date.now()): { day: number; minute: number } {
  const parts = fmt.formatToParts(typeof at === "number" ? new Date(at) : at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return { day: WEEKDAY_INDEX[get("weekday")] ?? 0, minute: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** 1170 -> "۱۹:۳۰" */
export function hhmm(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return toFaDigits(`${h}:${String(m % 60).padStart(2, "0")}`);
}

export type OpenState = "open" | "closed" | "unknown";

export interface OpenStatus {
  state: OpenState;
  /** Minutes since midnight when it closes (state = open). */
  closesAt?: number;
  /** Minutes until it closes (state = open). */
  closesIn?: number;
  /** When it opens next (state = closed): days from the given day, and minute. */
  opensAt?: { dayOffset: number; minute: number };
  /** Short Persian label: «باز • تا ۲۰:۰۰», «بسته • فردا ۱۰:۰۰», «ساعت کاری ثبت نشده». */
  label: string;
}

const CLOSING_SOON_MIN = 45;

export function openStatus(hours: WeekHours | null, at: number | Date = Date.now()): OpenStatus {
  if (!hours) return { state: "unknown", label: "ساعت کاری ثبت نشده" };
  const { day, minute } = tehranClock(at);
  const today = hours[day];
  if (today === null) return { state: "unknown", label: "ساعت امروز ثبت نشده" };
  const shift = today.find(([a, b]) => minute >= a && minute < b);
  if (shift) {
    const closesIn = shift[1] - minute;
    const soon = closesIn <= CLOSING_SOON_MIN;
    return {
      state: "open",
      closesAt: shift[1],
      closesIn,
      label: soon ? `باز • ${toFaDigits(closesIn)} دقیقه دیگه می‌بنده` : `باز • تا ${hhmm(shift[1])}`,
    };
  }
  // Find the next opening within a week.
  for (let offset = 0; offset < 7; offset++) {
    const d = hours[(day + offset) % 7];
    if (!d) continue;
    const next = d.map(([a]) => a).filter((a) => offset > 0 || a > minute).sort((x, y) => x - y)[0];
    if (next !== undefined) {
      const when = offset === 0 ? `امروز ${hhmm(next)}` : offset === 1 ? `فردا ${hhmm(next)}` : `${DAY_NAMES[(day + offset) % 7]} ${hhmm(next)}`;
      return { state: "closed", opensAt: { dayOffset: offset, minute: next }, label: `بسته • باز میشه ${when}` };
    }
  }
  return { state: "closed", label: "بسته" };
}

/** True when the shop is open at that time and stays open at least `minutes` more. */
export function isOpenFor(hours: WeekHours | null, at: number, minutes = 20): boolean {
  const s = openStatus(hours, at);
  return s.state === "open" && (s.closesIn ?? 0) >= minutes;
}

/** «۱۰:۰۰ تا ۱۹:۰۰ و ۲۰:۰۰ تا ۲۲:۰۰» for one day. */
export function dayLabel(day: number[][] | null): string {
  if (day === null) return "ثبت نشده";
  if (day.length === 0) return "تعطیل";
  return day.map(([a, b]) => `${hhmm(a)} تا ${hhmm(b)}`).join(" و ");
}
