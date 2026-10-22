# Mizan — production image (Next.js standalone output + the Torob catalog).
# Prereq: catalog/catalog.db exists (npm run catalog). `liara deploy` gzips the upload (~90 MB).
# Build:  docker build -t mizan .
# Run:    docker run -p 3000:3000 -v mizan-data:/app/data --env-file .env mizan
#
# Kept fast on purpose (Liara caps build time): no compilers, no unpack step.
# better-sqlite3 ships prebuilt binaries, so install scripts (a node-gyp rebuild) are skipped.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm can leave optional WASM deps (@emnapi/*) out of a lock file made on Windows; `npm ci` then
# refuses on Linux. Fall back to a regular install from the same lock in that case.
RUN npm ci --ignore-scripts --no-audit --no-fund || npm install --ignore-scripts --no-audit --no-fund

FROM deps AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Only what `next build` needs, so the 180 MB catalog doesn't pass through this stage.
COPY package.json next.config.ts tsconfig.json ./
COPY public ./public
COPY src ./src
# NEXT_PUBLIC_* values are inlined at build time (feature flags).
ARG NEXT_PUBLIC_FEATURES_OFF=""
ARG NEXT_PUBLIC_FEATURES_ON=""
ENV NEXT_PUBLIC_FEATURES_OFF=$NEXT_PUBLIC_FEATURES_OFF NEXT_PUBLIC_FEATURES_ON=$NEXT_PUBLIC_FEATURES_ON
# The build doesn't read the catalog; it is copied into the final image below.
RUN npm run build

FROM node:24-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/app/data/mizan.db \
    CATALOG_PATH=/app/catalog/catalog.db
RUN mkdir -p /app/data /app/catalog && chown -R node:node /app
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# The native binding is located at runtime, so make sure the Linux prebuild is present.
COPY --from=build --chown=node:node /app/node_modules/better-sqlite3/prebuilds/linux-x64.node ./node_modules/better-sqlite3/prebuilds/linux-x64.node
# Read-only catalog lives outside /app/data (that path is the persistent disk for user data).
COPY --chown=node:node catalog/catalog.db ./catalog/catalog.db
USER node
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
