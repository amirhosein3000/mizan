import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { ShopScreen } from "./ShopScreen";

export default function ShopPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="m-4 h-40" />}>
      <ShopScreen params={params} />
    </Suspense>
  );
}
