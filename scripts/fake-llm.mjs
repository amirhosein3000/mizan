// Fake OpenAI-compatible server for testing the LIVE LLM code path without a key.
//   node scripts/fake-llm.mjs [port] [mode]      mode: ok | 401 | 500 | slow | junk
// Then run the app with LLM_BASE_URL=http://127.0.0.1:<port>/v1 LLM_API_KEY=x LLM_MODEL=fake MOCK_LLM=false
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 4011);
const mode = process.argv[3] ?? "ok";

const VISION_REPLY =
  "Sure! Here is what I found:\n```json\n" +
  JSON.stringify({
    items: [
      { brand: "Samsung", model: "Galaxy A56 5G 256GB", text: "8GB RAM", category: "mobile", price: 41500000, bbox: [0.05, 0.1, 0.4, 0.5] },
      { brand: "Golestan", model: "", text: "چای سیاه ممتاز ۴۵۰ گرم", category: "grocery", price: "۴۷۰٬۰۰۰", bbox: [0.55, 0.1, 0.4, 0.5] },
      { brand: "Unknown", model: "XYZ-000", text: "", category: "other", price: null, bbox: [0.3, 0.6, 0.3, 0.3] },
    ],
  }) +
  "\n```";

const server = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const send = (status, data) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  console.log(`[fake-llm] ${req.method} ${req.url} (${body.length} bytes) mode=${mode}`);
  if (mode === "401") return send(401, { error: { message: "invalid api key" } });
  if (mode === "500") return send(500, { error: { message: "upstream exploded" } });
  if (mode === "slow") return; // never answers -> client timeout
  if (mode === "junk") return send(200, { choices: [{ message: { content: "I cannot do JSON today" } }] });

  if (req.url?.endsWith("/audio/transcriptions")) return send(200, { text: "قیمت گلکسی ای ۵۶ چنده" });
  const parsed = JSON.parse(body || "{}");
  const hasImage = JSON.stringify(parsed.messages ?? []).includes("image_url");
  const content = hasImage ? VISION_REPLY : "سلام! این جواب از مدل آزمایشیه. قیمت معمولش رو بالا می‌بینی.";
  send(200, { choices: [{ message: { role: "assistant", content } }] });
});

server.listen(port, "127.0.0.1", () => console.log(`[fake-llm] listening on ${port} mode=${mode}`));
