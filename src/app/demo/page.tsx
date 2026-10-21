import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Skeleton } from "@/components/ui";
import { ean13Pattern, isValidEan13 } from "@/lib/ean13";
import { getPriceProvider } from "@/lib/price";

export const metadata: Metadata = { title: "کیت دمو" };

function BarcodeSvg({ code }: { code: string }) {
  const bits = ean13Pattern(code);
  return (
    <svg viewBox={`0 0 ${bits.length + 20} 60`} className="h-20 w-full bg-white" role="img" aria-label={`بارکد ${code}`}>
      {bits.split("").map((b, i) =>
        b === "1" ? <rect key={i} x={i + 10} y={4} width={1} height={i < 3 || (i >= 45 && i < 50) || i >= 92 ? 50 : 44} fill="#000" /> : null,
      )}
      <text x="50%" y="58" textAnchor="middle" fontSize="7" fontFamily="monospace" fill="#000">
        {code}
      </text>
    </svg>
  );
}

async function DemoBarcodes() {
  await connection();
  const products = (await getPriceProvider().listFeatured(30)).filter((p) => p.barcode && isValidEan13(p.barcode));
  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map((p) => (
        <div key={p.id} className="rounded-2xl bg-surface p-3">
          <BarcodeSvg code={p.barcode!} />
          <div className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5">{p.nameFa}</div>
        </div>
      ))}
    </div>
  );
}

/** Printable barcodes of mock products, to test the scanner from a second screen or paper. */
export default function DemoKitPage() {
  return (
    <>
      <AppHeader title="کیت دمو" back="/tools" />
      <main className="px-4 pb-6">
        <p className="mb-3 text-[13px] leading-6 text-muted">
          این بارکدها مال کالاهای داده‌ی نمایشی‌اند. صفحه رو روی یه گوشی یا لپ‌تاپ دیگه باز کن (یا چاپ کن) و با «شناسایی ← بارکد» اسکن کن.
        </p>
        <Suspense fallback={<Skeleton className="h-64" />}>
          <DemoBarcodes />
        </Suspense>
      </main>
    </>
  );
}
