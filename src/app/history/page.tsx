import type { Metadata } from "next";
import { requireFeature } from "@/lib/features-server";
import { HistoryScreen } from "./HistoryScreen";

export const metadata: Metadata = { title: "ذخیره‌ها" };

export default function HistoryPage() {
  requireFeature("history");
  return <HistoryScreen />;
}
