import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { SearchScreen } from "./SearchScreen";

export const metadata: Metadata = { title: "جستجو" };

export default function SearchPage() {
  return (
    <Suspense fallback={<Skeleton className="m-4 h-40" />}>
      <SearchScreen />
    </Suspense>
  );
}
