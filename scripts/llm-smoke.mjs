// End-to-end check of the LIVE LLM path and its failure modes, against scripts/fake-llm.mjs.
// Requires a standalone build:  npm run build && node scripts/llm-smoke.mjs
// For each fake-provider mode it starts the app, calls identify / xray / chat, and prints status + message.
import { spawn } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP_PORT = 3124;
const LLM_PORT = 4011;
const root = process.cwd();
const standalone = join(root, ".next", "standalone");
if (!existsSync(join(standalone, "server.js"))) {
  console.error("Run `npm run build` first.");
  process.exit(1);
}
cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });
cpSync(join(root, ".next", "static"), join(standalone, ".next", "static"), { recursive: true });

const IMG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url) {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`timeout waiting for ${url}`);
}

async function call(path, body) {
  const t = Date.now();
  try {
    const res = await fetch(`http://127.0.0.1:${APP_PORT}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const summary = data.error
      ? data.error.message
      : path === "/api/identify"
        ? `${data.confidence} -> ${data.candidates?.[0]?.product.id ?? "none"} (price ${data.reading?.price ?? "-"})`
        : path === "/api/xray"
          ? data.items.map((i) => `${i.match?.product.id ?? "?"}:${i.match?.verdict?.level ?? "-"}`).join(", ")
          : String(data.reply).slice(0, 60);
    return `${res.status} ${Date.now() - t}ms ${summary}`;
  } catch (err) {
    return `FETCH FAILED ${err.message}`;
  }
}

// "fallback" = primary unreachable, backup provider healthy -> must still answer 200.
const modes = ["ok", "fallback", "junk", "401", "500", "slow", "unreachable"];
let failures = 0;
for (const mode of modes) {
  const fake =
    mode === "unreachable"
      ? null
      : spawn(process.execPath, ["scripts/fake-llm.mjs", String(LLM_PORT), mode === "fallback" ? "ok" : mode], { stdio: "ignore" });
  const primaryDown = mode === "unreachable" || mode === "fallback";
  const db = join(tmpdir(), `chooneh-smoke-${mode}.db`);
  const app = spawn(process.execPath, ["server.js"], {
    cwd: standalone,
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      HOSTNAME: "127.0.0.1",
      DATABASE_PATH: db,
      MOCK_LLM: "false",
      LLM_BASE_URL: `http://127.0.0.1:${primaryDown ? 9 : LLM_PORT}/v1`,
      ...(mode === "fallback"
        ? { LLM_FALLBACK_BASE_URL: `http://127.0.0.1:${LLM_PORT}/v1`, LLM_FALLBACK_API_KEY: "test", LLM_FALLBACK_MODEL: "fake" }
        : {}),
      LLM_API_KEY: "test",
      LLM_MODEL: "fake",
      LLM_TIMEOUT_MS: "3000",
    },
  });
  try {
    await waitFor(`http://127.0.0.1:${APP_PORT}/api/health`);
    console.log(`\n=== provider mode: ${mode} ===`);
    for (const [path, body] of [
      ["/api/identify", { image: IMG }],
      ["/api/xray", { image: IMG }],
      ["/api/chat", { productId: "samsung-galaxy-a56-5g-256gb-8gb", messages: [{ role: "user", content: "ارزش خرید داره؟" }] }],
    ]) {
      const line = await call(path, body);
      // Healthy provider must give 200; a broken one must give a friendly 503 — never a crash or raw 500.
      const ok = mode === "ok" || mode === "fallback" ? line.startsWith("200") : /^(200|503) /.test(line);
      if (!ok) failures++;
      console.log(`  ${path.padEnd(14)} ${line}`);
    }
  } finally {
    app.kill();
    fake?.kill();
    await sleep(400);
    for (const f of [db, `${db}-wal`, `${db}-shm`]) rmSync(f, { force: true });
  }
}
console.log(failures ? `\n${failures} unexpected result(s)` : "\nAll modes handled (no crashes, no raw 500s).");
process.exit(failures ? 1 : 0);
