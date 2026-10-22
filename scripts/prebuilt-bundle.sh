#!/usr/bin/env bash
# Build Mizan on Linux (e.g. WSL) and assemble a copy-only Docker context in ./deploy-bundle.
# Liara caps build time per feature plan; this image builds in about a minute because it
# only copies files (no npm install, no next build on the builder).
#
#   bash scripts/prebuilt-bundle.sh            # from the repo root, on Linux / WSL
#   liara deploy --path deploy-bundle -a mizan --platform docker -p 3000 -d data:/app/data
set -euo pipefail
cd "$(dirname "$0")/.."
test -f catalog/catalog.db || { echo "catalog/catalog.db missing: run 'npm run catalog'"; exit 1; }
[ "$(uname -s)" = "Linux" ] || { echo "run this on Linux (native better-sqlite3 binary + Linux paths)"; exit 1; }

npm ci --ignore-scripts --no-audit --no-fund || npm install --ignore-scripts --no-audit --no-fund
NEXT_TELEMETRY_DISABLED=1 npx next build

out=deploy-bundle
stage=$(mktemp -d)
cp -r .next/standalone/. "$stage/"
mkdir -p "$stage/.next" "$stage/catalog" "$stage/node_modules/better-sqlite3/prebuilds"
cp -r .next/static "$stage/.next/static"
cp -r public "$stage/public"
cp node_modules/better-sqlite3/prebuilds/linux-x64.node "$stage/node_modules/better-sqlite3/prebuilds/"
cp catalog/catalog.db "$stage/catalog/catalog.db"
rm -rf "$stage/data" "$stage/.env" "$stage/.env."*

# One tarball: `liara deploy` always skips folders named node_modules / .next (at any depth),
# and Docker's ADD unpacks a local tar by itself.
rm -rf "$out" && mkdir -p "$out"
tar -cf "$out/app.tar" -C "$stage" .
rm -rf "$stage"

cat > "$out/Dockerfile" <<'EOF2'
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0     DATABASE_PATH=/app/data/mizan.db CATALOG_PATH=/app/catalog/catalog.db
ADD app.tar /app/
# Runs as root: Liara mounts the persistent disk at /app/data owned by root.
RUN mkdir -p /app/data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s   CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
EOF2
du -sh "$out"
echo "Bundle ready in $out"
