import { fail, handle } from "@/lib/http";
import { getProductBundle } from "@/lib/product-service";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const bundle = await getProductBundle(decodeURIComponent(id));
  if (!bundle) return fail(404, "not_found", "این کالا پیدا نشد.");
  return Response.json(bundle);
});
