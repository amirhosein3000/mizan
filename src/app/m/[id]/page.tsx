import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireFeature } from "@/lib/features-server";
import { MissionScreen } from "./MissionScreen";

export const metadata: Metadata = { title: "تماس‌های میزان" };

export default function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  requireFeature("agentCalls");
  return (
    <Suspense fallback={<Skeleton className="m-4 h-40" />}>
      <MissionScreen params={params} />
    </Suspense>
  );
}
