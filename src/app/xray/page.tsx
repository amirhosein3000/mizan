import type { Metadata } from "next";
import { requireFeature } from "@/lib/features-server";
import { XrayScreen } from "./XrayScreen";

export const metadata: Metadata = { title: "اشعه‌ی ایکس قیمت" };

export default function XrayPage() {
  requireFeature("xray");
  return <XrayScreen />;
}
