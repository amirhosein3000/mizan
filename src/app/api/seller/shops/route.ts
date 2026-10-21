// Seller panel shop picker: search by name / passage, plus shops the agent called recently.
import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { recentlyCalledShops } from "@/lib/agent/seller";
import { handle } from "@/lib/http";
import { CENTRAL_TEHRAN } from "@/lib/shop/places";
import { normalizeText } from "@/lib/text";

export const GET = handle(async (req: Request) => {
  await connection();
  const q = normalizeText(new URL(req.url).searchParams.get("q") ?? "");
  const catalog = getCatalog();
  const matches = q.length >= 2
    ? catalog
        .shopsNear(CENTRAL_TEHRAN, 60_000, { limit: 10_000 })
        .filter((s) => normalizeText(`${s.name} ${s.mall ?? ""} ${s.area ?? ""}`).includes(q))
        .slice(0, 20)
    : [];
  return Response.json({ recent: recentlyCalledShops(), matches });
});
