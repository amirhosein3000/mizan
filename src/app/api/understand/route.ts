// «یه هدفون انکر زیر ۵ میلیون نزدیک جمهوری، قسطی» -> structured intent for the search screen.
import { visitTimeFor } from "@/lib/agent/intent";
import { understand } from "@/lib/ai/understand";
import { fail, handle, readJson } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const body = await readJson<{ text?: string }>(req);
  const text = body?.text?.trim().slice(0, 300);
  if (!text) return fail(400, "bad_request", "چیزی ننوشتی.");
  const intent = await understand(text);
  return Response.json({ intent, visitAt: visitTimeFor(intent.when) });
});
