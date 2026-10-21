import type { Metadata } from "next";
import { Suspense } from "react";
import { requireFeature } from "@/lib/features-server";
import { ScanScreen } from "./ScanScreen";

export const metadata: Metadata = { title: "شناسایی کالا" };

export default function ScanPage() {
  requireFeature("identify");
  return (
    <Suspense>
      <ScanScreen />
    </Suspense>
  );
}
