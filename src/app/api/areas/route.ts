// Starting points for the location picker: dataset neighbourhoods + landmarks.
import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { handle } from "@/lib/http";
import { LANDMARKS } from "@/lib/shop/places";

export const GET = handle(async () => {
  await connection();
  const catalog = getCatalog();
  return Response.json({
    areas: catalog.areas().filter((a) => a.shops >= 3),
    landmarks: LANDMARKS.map(({ name, lat, lon }) => ({ name, lat, lon })),
    stats: catalog.stats(),
  });
});
