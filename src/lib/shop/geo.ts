// Distances, travel-time estimates and map links. Pure.
import { formatNumber } from "../format";

export interface LatLon {
  lat: number;
  lon: number;
}

/** Great-circle distance in metres. */
export function distanceM(a: LatLon, b: LatLon): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** «۸۵۰ متر», «۳٫۴ کیلومتر» */
export function formatDistance(m: number): string {
  if (m < 1000) return `${formatNumber(Math.max(10, Math.round(m / 10) * 10))} متر`;
  return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(m / 1000)} کیلومتر`;
}

export type TravelMode = "walk" | "car";

/**
 * Rough door-to-door estimate for Tehran. Streets aren't straight lines (×1.3),
 * walking ≈ 4.5 km/h, central-Tehran driving ≈ 15 km/h plus ~8 min to park.
 */
export function travelEstimate(m: number): { mode: TravelMode; minutes: number; label: string } {
  const road = m * 1.3;
  if (road <= 1600) {
    const minutes = Math.max(1, Math.round(road / 75));
    return { mode: "walk", minutes, label: `${formatNumber(minutes)} دقیقه پیاده` };
  }
  const minutes = Math.round(road / 250) + 8;
  return { mode: "car", minutes, label: `حدود ${formatNumber(minutes)} دقیقه با ماشین` };
}

/**
 * Approximate «طرح ترافیک» (central Tehran congestion-charge zone) as a box.
 * Good enough for a hint («با مترو برو»), never for enforcement decisions.
 */
const TRAFFIC_ZONE = { south: 35.665, north: 35.728, west: 51.383, east: 51.447 };

export function inTrafficZone(p: LatLon): boolean {
  return p.lat >= TRAFFIC_ZONE.south && p.lat <= TRAFFIC_ZONE.north && p.lon >= TRAFFIC_ZONE.west && p.lon <= TRAFFIC_ZONE.east;
}

/** Deep links into the navigation apps people actually use in Tehran. */
export function mapLinks(p: LatLon) {
  const ll = `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
  return {
    neshan: `https://neshan.org/maps/@${ll},17z,0p`,
    balad: `https://balad.ir/location?latitude=${p.lat.toFixed(6)}&longitude=${p.lon.toFixed(6)}&zoom=17`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${ll}`,
    waze: `https://waze.com/ul?ll=${ll}&navigate=yes`,
    geo: `geo:${ll}?q=${ll}`,
  };
}
