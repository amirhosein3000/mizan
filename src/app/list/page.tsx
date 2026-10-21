import type { Metadata } from "next";
import { requireFeature } from "@/lib/features-server";
import { ListScreen } from "@/modules/shopping-list/ListScreen";

export const metadata: Metadata = { title: "لیست خرید" };

export default function ListPage() {
  requireFeature("shoppingList");
  return <ListScreen />;
}
