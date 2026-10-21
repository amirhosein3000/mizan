import "server-only";
import { notFound } from "next/navigation";
import { isEnabled, type FeatureId } from "@/config/features";
import { fail } from "@/lib/http";

/** In a page: 404 when the module is switched off. */
export function requireFeature(id: FeatureId): void {
  if (!isEnabled(id)) notFound();
}

/** In a route handler: returns a 404 Response when off, else null. */
export function featureOff(id: FeatureId): Response | null {
  return isEnabled(id) ? null : fail(404, "feature_off", "این امکان فعلاً خاموشه.");
}
