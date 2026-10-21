import { getPriceProvider } from "@/lib/price";
import { fail, handle } from "@/lib/http";
import { featureOff } from "@/lib/features-server";

export const GET = handle(async (req: Request) => {
  const off = featureOff("identify");
  if (off) return off;
  const code = new URL(req.url).searchParams.get("code")?.trim() ?? "";
  if (!code) return fail(400, "missing_code", "بارکد خالیه.");
  const product = await getPriceProvider().findByBarcode(code);
  if (!product) return fail(404, "not_found", "این بارکد تو فهرست ما نیست. اسمش رو تایپ کن.");
  return Response.json({ product });
});
