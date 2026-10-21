// Per-device history / saved list (SQLite).
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { fail, getDeviceId, handle, readJson } from "@/lib/http";
import { featureOff } from "@/lib/features-server";

const { history } = schema;

export const GET = handle(async () => {
  const off = featureOff("history");
  if (off) return off;
  const deviceId = await getDeviceId();
  const rows = getDb()
    .select()
    .from(history)
    .where(eq(history.deviceId, deviceId))
    .orderBy(desc(history.updatedAt))
    .limit(100)
    .all();
  const totalSaved = rows.reduce((acc, r) => {
    if (r.paidPrice == null) return acc;
    const ref = Math.max(r.storePrice ?? 0, r.onlineMedian ?? 0);
    return acc + Math.max(0, ref - r.paidPrice);
  }, 0);
  return Response.json({ items: rows, totalSaved });
});

interface UpsertBody {
  productId: string;
  productName: string;
  category: string;
  storePrice?: number | null;
  paidPrice?: number | null;
  onlineMedian?: number | null;
  onlineMin?: number | null;
  verdict?: string | null;
  saved?: boolean;
}

/** Upsert the latest look at a product. Only provided fields are updated. */
export const POST = handle(async (req: Request) => {
  const off = featureOff("history");
  if (off) return off;
  const body = await readJson<UpsertBody>(req);
  if (!body?.productId || !body.productName) return fail(400, "bad_request", "اطلاعات کالا ناقصه.");
  const deviceId = await getDeviceId();
  const now = Date.now();
  const patch = Object.fromEntries(
    Object.entries({
      productName: body.productName,
      category: body.category,
      storePrice: body.storePrice,
      paidPrice: body.paidPrice,
      onlineMedian: body.onlineMedian,
      onlineMin: body.onlineMin,
      verdict: body.verdict,
      saved: body.saved,
    }).filter(([, v]) => v !== undefined),
  );
  const row = getDb()
    .insert(history)
    .values({
      deviceId,
      productId: body.productId,
      productName: body.productName,
      category: body.category ?? "",
      storePrice: body.storePrice ?? null,
      paidPrice: body.paidPrice ?? null,
      onlineMedian: body.onlineMedian ?? null,
      onlineMin: body.onlineMin ?? null,
      verdict: body.verdict ?? null,
      saved: body.saved ?? false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({ target: [history.deviceId, history.productId], set: { ...patch, updatedAt: now } })
    .returning()
    .get();
  return Response.json({ item: row });
});

export const DELETE = handle(async (req: Request) => {
  const off = featureOff("history");
  if (off) return off;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return fail(400, "bad_request", "شناسه نامعتبره.");
  const deviceId = await getDeviceId();
  getDb().delete(history).where(and(eq(history.id, id), eq(history.deviceId, deviceId))).run();
  return Response.json({ ok: true });
});
