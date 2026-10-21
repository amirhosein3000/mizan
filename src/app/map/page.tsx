import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireFeature } from "@/lib/features-server";
import { MapScreen } from "./MapScreen";

export const metadata: Metadata = { title: "نقشه‌ی فروشگاه‌ها" };

export default function MapPage() {
  requireFeature("map");
  return (
    <Suspense fallback={<Skeleton className="m-4 h-80" />}>
      <MapScreen />
    </Suspense>
  );
}
