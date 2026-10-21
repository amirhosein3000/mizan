import type { Metadata } from "next";
import { requireFeature } from "@/lib/features-server";
import { TrackScreen } from "./TrackScreen";

export const metadata: Metadata = { title: "پیگیری‌ها" };

export default function TrackPage() {
  requireFeature("track");
  return <TrackScreen />;
}
