"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/** Page header. In RTL the back chevron points right. */
export function AppHeader({ title, back, action }: { title: ReactNode; back?: string | true; action?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-bg/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur">
      {back &&
        (typeof back === "string" ? (
          <Link href={back} className="grid size-10 place-items-center rounded-full active:bg-surface-2" aria-label="بازگشت">
            <ChevronRight className="size-6" />
          </Link>
        ) : (
          <button
            onClick={() => (history.length > 1 ? router.back() : router.push("/"))}
            className="grid size-10 place-items-center rounded-full active:bg-surface-2"
            aria-label="بازگشت"
          >
            <ChevronRight className="size-6" />
          </button>
        ))}
      <h1 className="min-w-0 flex-1 truncate text-[17px] font-extrabold">{title}</h1>
      {action}
    </header>
  );
}
