import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { ProductScreen } from "./ProductScreen";

function ProductSkeleton() {
  return (
    <div className="space-y-3 p-4 pt-16">
      <Skeleton className="h-20" />
      <Skeleton className="h-40" />
      <Skeleton className="h-28" />
    </div>
  );
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductScreen params={params} />
    </Suspense>
  );
}
