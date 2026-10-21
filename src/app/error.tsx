"use client";
import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-[40px]">😕</div>
      <p className="text-[15px] leading-7">یه مشکلی پیش اومد. دوباره امتحان کن.</p>
      <Button onClick={reset}>دوباره</Button>
    </main>
  );
}
