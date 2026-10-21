// Pack catalog/catalog.db -> catalog/catalog.db.xz for deployment (the Docker build unpacks it).
// Uses the `xz` CLI (Git Bash on Windows, macOS, Linux all have it).
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";

const src = "catalog/catalog.db";
if (!existsSync(src)) {
  console.error("catalog/catalog.db not found — run `npm run catalog` first.");
  process.exit(1);
}
execFileSync("xz", ["-T0", "-6", "-k", "-f", src], { stdio: "inherit" });
const mb = (f) => (statSync(f).size / 1e6).toFixed(1);
console.log(`catalog.db ${mb(src)} MB -> catalog.db.xz ${mb(`${src}.xz`)} MB`);
