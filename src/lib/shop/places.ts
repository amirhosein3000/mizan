// Well-known Tehran starting points (approximate centres) for shoppers who don't
// share GPS. Dataset neighbourhoods (exact shop centroids) are added at runtime
// from the catalog's areas().
import { normalizeText } from "../text";
import type { LatLon } from "./geo";

export interface Landmark extends LatLon {
  name: string;
  /** Extra spellings people type. */
  aliases?: string[];
}

/** Where most dataset shops are (Jomhouri / Lalehzar); the map's default centre. */
export const CENTRAL_TEHRAN: LatLon = { lat: 35.6955, lon: 51.4155 };

export const LANDMARKS: Landmark[] = [
  { name: "میدان انقلاب", lat: 35.7009, lon: 51.3911, aliases: ["انقلاب"] },
  { name: "میدان امام خمینی (توپخانه)", lat: 35.6858, lon: 51.4205, aliases: ["توپخانه", "امام خمینی"] },
  { name: "میدان فردوسی", lat: 35.7015, lon: 51.4195, aliases: ["فردوسی"] },
  { name: "خیابان جمهوری (پاساژ علاءالدین)", lat: 35.6949, lon: 51.4071, aliases: ["جمهوری", "علاالدین", "علاءالدین", "چارسو"] },
  { name: "لاله‌زار", lat: 35.6935, lon: 51.4185, aliases: ["لاله زار", "لالهزار"] },
  { name: "میدان بهارستان", lat: 35.6917, lon: 51.4331, aliases: ["بهارستان"] },
  { name: "بازار بزرگ", lat: 35.6748, lon: 51.4214, aliases: ["بازار", "پانزده خرداد", "۱۵ خرداد"] },
  { name: "میدان ولیعصر", lat: 35.7105, lon: 51.4071, aliases: ["ولیعصر"] },
  { name: "میدان هفت تیر", lat: 35.7156, lon: 51.4247, aliases: ["هفت تیر", "۷ تیر"] },
  { name: "میدان آزادی", lat: 35.6997, lon: 51.338, aliases: ["آزادی"] },
  { name: "میدان ونک", lat: 35.7576, lon: 51.4097, aliases: ["ونک"] },
  { name: "میرداماد", lat: 35.7606, lon: 51.4329, aliases: ["مدرس"] },
  { name: "میدان تجریش", lat: 35.8046, lon: 51.4336, aliases: ["تجریش"] },
  { name: "صادقیه", lat: 35.7172, lon: 51.3354, aliases: ["فلکه دوم صادقیه"] },
  { name: "تهرانپارس", lat: 35.7363, lon: 51.5293, aliases: ["تهران پارس"] },
  { name: "نارمک", lat: 35.7426, lon: 51.4985 },
  { name: "شهرک غرب", lat: 35.7569, lon: 51.3726, aliases: ["میدان صنعت"] },
  { name: "میدان شوش", lat: 35.6628, lon: 51.4329, aliases: ["شوش"] },
];

/** Find a landmark mentioned in free text («نزدیک ونک», «تو جمهوری»). */
export function findLandmark(text: string): Landmark | null {
  const t = ` ${normalizeText(text)} `;
  let best: { lm: Landmark; len: number } | null = null;
  for (const lm of LANDMARKS) {
    for (const name of [lm.name, ...(lm.aliases ?? [])]) {
      const n = normalizeText(name);
      if (n && t.includes(` ${n} `) && (!best || n.length > best.len)) best = { lm, len: n.length };
    }
  }
  return best?.lm ?? null;
}
