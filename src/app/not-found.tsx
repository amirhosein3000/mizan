import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-[56px] font-black text-brand">۴۰۴</div>
      <p className="text-[15px] leading-7">این صفحه پیدا نشد، یا این امکان فعلاً خاموشه.</p>
      <LinkButton href="/">برگرد خونه</LinkButton>
    </main>
  );
}
