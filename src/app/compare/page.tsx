import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireFeature } from "@/lib/features-server";
import { CompareScreen } from "./CompareScreen";

export const metadata: Metadata = { title: "مقایسه" };

export default function ComparePage() {
  requireFeature("compare");
  return (
    <Suspense fallback={<Skeleton className="m-4 h-80" />}>
      <CompareScreen />
    </Suspense>
  );
}
