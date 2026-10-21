"use client";
import Link from "next/link";
import { ChevronLeft, PhoneCall } from "lucide-react";
import type { MissionStatus, MissionSummary } from "@/lib/agent/missions";
import { formatNumber, formatTomanShort, timeAgo } from "@/lib/format";
import { Pill, type Tone } from "./ui";

export const MISSION_STATUS: Record<MissionStatus, { label: string; tone: Tone }> = {
  calling: { label: "در حال تماس", tone: "brand" },
  ready: { label: "پیدا شد", tone: "good" },
  no_luck: { label: "پیدا نشد", tone: "high" },
  visiting: { label: "در راه", tone: "info" },
  bought: { label: "خریدی", tone: "good" },
  cancelled: { label: "لغو شد", tone: "muted" },
};

export function MissionRow({ m }: { m: MissionSummary }) {
  const st = MISSION_STATUS[m.status];
  return (
    <Link href={`/m/${m.id}`} className="flex items-center gap-3 rounded-2xl bg-surface p-3 active:bg-surface-2">
      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${m.status === "calling" ? "ring-pulse bg-brand text-white" : "bg-brand-soft text-brand"}`}>
        <PhoneCall className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-[14px] font-bold">{m.productTitle}</span>
        <span className="mt-0.5 line-clamp-1 block text-[12px] text-muted">
          {m.bestShop
            ? `${m.bestShop.name}${m.bestShop.price ? ` • ${formatTomanShort(m.bestShop.price)}` : ""}`
            : `${formatNumber(m.calls)} تماس • ${timeAgo(m.updatedAt)}`}
        </span>
      </span>
      <Pill tone={st.tone}>{st.label}</Pill>
      <ChevronLeft className="size-4 text-muted" />
    </Link>
  );
}
