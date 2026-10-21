import Link from "next/link";
import type { Metadata } from "next";
import { Printer } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { FEATURE_ICONS } from "@/components/icons";
import { enabledFeatures } from "@/config/features";

export const metadata: Metadata = { title: "ابزارها" };

/** Every enabled module that owns a page shows up here automatically. */
export default function ToolsPage() {
  const tools = enabledFeatures().filter((f) => f.href);
  return (
    <>
      <AppHeader title="ابزارها" />
      <main className="grid grid-cols-2 gap-3 px-4 pb-6">
        {tools.map((f) => {
          const Icon = FEATURE_ICONS[f.icon] ?? FEATURE_ICONS.scan;
          return (
            <Link key={f.id} href={f.href!} className="flex flex-col gap-2 rounded-3xl bg-surface p-4 active:bg-surface-2">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand">
                <Icon className="size-6" />
              </span>
              <span className="text-[15px] font-extrabold">{f.titleFa}</span>
              <span className="text-[12px] leading-5 text-muted">{f.descriptionFa}</span>
            </Link>
          );
        })}
        <Link href="/demo" className="flex flex-col gap-2 rounded-3xl border-2 border-dashed border-line p-4 active:bg-surface-2">
          <span className="grid size-11 place-items-center rounded-2xl bg-surface-2 text-muted">
            <Printer className="size-6" />
          </span>
          <span className="text-[15px] font-extrabold">کیت دمو</span>
          <span className="text-[12px] leading-5 text-muted">بارکدهای نمونه برای امتحان اسکنر</span>
        </Link>
      </main>
    </>
  );
}
