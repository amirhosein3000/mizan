import Link from "next/link";
import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { FEATURE_ICONS } from "@/components/icons";
import { enabledFeatures, type FeatureDef } from "@/config/features";

export const metadata: Metadata = { title: "تو مغازه" };

function Tile({ f }: { f: FeatureDef }) {
  const Icon = FEATURE_ICONS[f.icon] ?? FEATURE_ICONS.scan;
  return (
    <Link href={f.href!} className="flex flex-col gap-2 rounded-3xl bg-surface p-4 active:bg-surface-2">
      <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icon className="size-6" />
      </span>
      <span className="text-[15px] font-extrabold">{f.titleFa}</span>
      <span className="text-[12px] leading-5 text-muted">{f.descriptionFa}</span>
    </Link>
  );
}

/** In-store tools, plus every other module that owns a page (auto-listed from feature flags). */
export default function ToolsPage() {
  const features = enabledFeatures().filter((f) => f.href);
  const instore = features.filter((f) => f.group === "instore" && f.id !== "xray");
  const xray = features.find((f) => f.id === "xray");
  const rest = features.filter((f) => f.group !== "instore");
  return (
    <>
      <AppHeader title="تو مغازه" />
      <main className="px-4 pb-8">
        {xray && (
          <Link
            href={xray.href!}
            className="block rounded-3xl bg-gradient-to-br from-[#2e2378] via-brand to-[#8a5cf6] p-5 text-white shadow-[0_14px_30px_-12px_rgba(91,71,224,0.8)] active:scale-[0.99]"
          >
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#ffd166]">
              <Zap className="size-4" fill="currentColor" /> ایکس‌ری قیمت
            </div>
            <div className="mt-1 text-[20px] font-black leading-8">قفسه رو اسکن کن</div>
            <p className="mt-1 text-[13px] leading-6 opacity-90">کنار هر کالا می‌بینی قیمت این مغازه نسبت به بازار تهران خوبه (سبز)، منصفانه (زرد) یا گرون (قرمز).</p>
          </Link>
        )}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {instore.map((f) => (
            <Tile key={f.id} f={f} />
          ))}
        </div>
        {rest.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 px-1 text-[15px] font-extrabold">بقیه‌ی امکانات</h2>
            <div className="grid grid-cols-2 gap-3">
              {rest.map((f) => (
                <Tile key={f.id} f={f} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
