// Shopping list module API (flag: shoppingList).
import { fail, getDeviceId, handle, readJson } from "@/lib/http";
import { featureOff } from "@/lib/features-server";
import { splitListText } from "@/modules/shopping-list/logic";
import { addItems, clearDone, deleteItem, getList, setBudget, updateItem } from "@/modules/shopping-list/service";

export const GET = handle(async () => {
  const off = featureOff("shoppingList");
  if (off) return off;
  return Response.json(getList(await getDeviceId()));
});

/** Add items: { text } — may contain several items (one per line / comma). */
export const POST = handle(async (req: Request) => {
  const off = featureOff("shoppingList");
  if (off) return off;
  const body = await readJson<{ text?: string }>(req);
  const texts = splitListText(body?.text ?? "");
  if (texts.length === 0) return fail(400, "empty", "اسم یه کالا رو بنویس.");
  const deviceId = await getDeviceId();
  await addItems(deviceId, texts);
  return Response.json(getList(deviceId));
});

/** Update an item ({ id, done?, price? }) or the budget ({ budget }). */
export const PATCH = handle(async (req: Request) => {
  const off = featureOff("shoppingList");
  if (off) return off;
  const body = await readJson<{ id?: number; done?: boolean; price?: number | null; budget?: number | null }>(req);
  if (!body) return fail(400, "bad_request", "درخواست نامعتبره.");
  const deviceId = await getDeviceId();
  if (body.id) updateItem(deviceId, body.id, { done: body.done, price: body.price });
  else if ("budget" in body) setBudget(deviceId, body.budget ?? null);
  return Response.json(getList(deviceId));
});

/** DELETE ?id=… removes one item; ?done=1 clears ticked items. */
export const DELETE = handle(async (req: Request) => {
  const off = featureOff("shoppingList");
  if (off) return off;
  const url = new URL(req.url);
  const deviceId = await getDeviceId();
  if (url.searchParams.get("done")) clearDone(deviceId);
  else deleteItem(deviceId, Number(url.searchParams.get("id")));
  return Response.json(getList(deviceId));
});
