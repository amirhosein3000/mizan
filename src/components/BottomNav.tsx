"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { History, House, LayoutGrid, ScanLine, Zap } from "lucide-react";
import { isEnabled } from "@/config/features";

const SIDE_ITEMS = [
  { href: "/", label: "خانه", icon: House, feature: null },
  { href: "/scan", label: "شناسایی", icon: ScanLine, feature: "identify" as const },
  { href: "/history", label: "ذخیره‌ها", icon: History, feature: "history" as const },
  { href: "/tools", label: "ابزارها", icon: LayoutGrid, feature: null },
];

/** Routes that run full-screen (camera) hide the nav. */
const HIDDEN_ON = ["/xray"];

/**
 * usePathname() suspends while prerendering routes with unknown dynamic params
 * (e.g. /p/[id]), so the nav renders inside Suspense with a no-active-tab fallback.
 */
export function BottomNav() {
  return (
    <Suspense fallback={<NavBar pathname="" />}>
      <ActiveNav />
    </Suspense>
  );
}

function ActiveNav() {
  return <NavBar pathname={usePathname()} />;
}

function NavBar({ pathname }: { pathname: string }) {
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const items = SIDE_ITEMS.filter((i) => !i.feature || isEnabled(i.feature));
  const half = Math.ceil(items.length / 2);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const renderItem = (item: (typeof SIDE_ITEMS)[number]) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? "text-brand" : "text-muted"}`}
      >
        <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.9} />
        {item.label}
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="flex h-[64px] items-stretch px-2">
        {items.slice(0, half).map(renderItem)}
        {isEnabled("xray") && (
          <Link href="/xray" className="relative -mt-5 flex flex-1 flex-col items-center" aria-label="اشعه‌ی ایکس قیمت">
            <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-brand to-[#8a5cf6] text-white shadow-[0_8px_20px_-6px_rgba(91,71,224,0.7)] ring-4 ring-bg">
              <Zap className="size-7" fill="currentColor" />
            </span>
            <span className="mt-0.5 text-[11px] font-bold text-brand">ایکس‌ری</span>
          </Link>
        )}
        {items.slice(half).map(renderItem)}
      </div>
    </nav>
  );
}
