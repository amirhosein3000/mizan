import type { Metadata } from "next";
import { requireFeature } from "@/lib/features-server";
import { SellerScreen } from "./SellerScreen";

export const metadata: Metadata = { title: "پنل فروشنده" };

export default function SellerPage() {
  requireFeature("seller");
  return <SellerScreen />;
}
