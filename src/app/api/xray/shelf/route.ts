// Products for the drawn "sample shelf" (X-ray demo without a camera).
import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { handle } from "@/lib/http";

const SETS = [
  { q: "هدفون انکر", category: "هدفون، هدست و هندزفری" },
  { q: "گوشی سامسونگ", category: "گوشی موبایل" },
  { q: "شارژر", category: "شارژر گوشی" },
  { q: "اسپیکر بلوتوثی", category: "اسپیکر و سیستم صوتی" },
];

export const GET = handle(async (req: Request) => {
  await connection();
  const set = SETS[Math.abs(Number(new URL(req.url).searchParams.get("set")) || 0) % SETS.length];
  const products = getCatalog()
    .search(set.q, { category: set.category }, 20)
    .products.filter((p) => p.price && p.offerCount >= 3)
    .slice(0, 4);
  return Response.json({ products });
});
