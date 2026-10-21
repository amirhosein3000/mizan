import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "./ui";

/** A product / shop link that no longer resolves: say so and offer a way forward. */
export function NotFoundState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-3 p-4">
      <EmptyState icon={<SearchX className="size-6" />} title={title}>
        {children ?? "ممکنه لینک قدیمی باشه یا از داده‌ها حذف شده باشه."}
      </EmptyState>
      <div className="flex gap-2">
        <Link href="/search" className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-brand text-[15px] font-bold text-white">
          جستجوی دوباره
        </Link>
        <Link href="/" className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-line bg-surface text-[15px] font-bold">
          خانه
        </Link>
      </div>
    </div>
  );
}
