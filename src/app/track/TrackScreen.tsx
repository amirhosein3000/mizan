"use client";
// Follow-ups: every mission (calls, recommendation, visit) in one place.
import Link from "next/link";
import { History, PhoneCall } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { MissionRow } from "@/components/MissionRow";
import { EmptyState, ErrorNote, LinkButton, SectionTitle, Skeleton } from "@/components/ui";
import { isEnabled } from "@/config/features";
import type { MissionSummary } from "@/lib/agent/missions";
import { usePoll } from "@/lib/use-api";

const keepPolling = (d: { missions: MissionSummary[] }) => d.missions.some((m) => m.status === "calling");

export function TrackScreen() {
  const { data, error } = usePoll<{ missions: MissionSummary[] }>("/api/missions", 2000, keepPolling);
  const missions = data?.missions;
  const active = missions?.filter((m) => ["calling", "ready", "visiting", "no_luck"].includes(m.status)) ?? [];
  const done = missions?.filter((m) => ["bought", "cancelled"].includes(m.status)) ?? [];

  return (
    <>
      <AppHeader title="پیگیری‌ها" />
      <main className="px-4 pb-8">
        {error && <ErrorNote message={error} />}
        {!missions && !error && (
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}
        {missions && missions.length === 0 && (
          <EmptyState icon={<PhoneCall className="size-6" />} title="هنوز پیگیری‌ای نداری">
            یه کالا پیدا کن و بزن «میزان زنگ بزنه»؛ نتیجه‌ی تماس‌ها، پیشنهاد و برنامه‌ی رفتن اینجا می‌مونه.
            <LinkButton href="/" className="mt-4 w-full">
              شروع کن
            </LinkButton>
          </EmptyState>
        )}
        {active.length > 0 && (
          <>
            <SectionTitle>در جریان</SectionTitle>
            <div className="flex flex-col gap-2">
              {active.map((m) => (
                <MissionRow key={m.id} m={m} />
              ))}
            </div>
          </>
        )}
        {done.length > 0 && (
          <>
            <SectionTitle>تمام‌شده</SectionTitle>
            <div className="flex flex-col gap-2 opacity-80">
              {done.map((m) => (
                <MissionRow key={m.id} m={m} />
              ))}
            </div>
          </>
        )}
        {isEnabled("history") && (
          <Link href="/history" className="mt-6 flex items-center gap-3 rounded-2xl bg-surface p-3.5 text-[14px] font-bold active:bg-surface-2">
            <History className="size-5 text-muted" /> کالاهایی که دیدی و ذخیره کردی
          </Link>
        )}
      </main>
    </>
  );
}
