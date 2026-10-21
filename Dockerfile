# Mizan — production image (Next.js standalone output).
# Build:  docker build -t mizan .
# Run:    docker run -p 3000:3000 -v mizan-data:/app/data --env-file .env mizan

FROM node:24-bookworm-slim AS deps
WORKDIR /app
# Build tools are only a fallback in case better-sqlite3 has no prebuilt binary.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined at build time (feature flags).
ARG NEXT_PUBLIC_FEATURES_OFF=""
ARG NEXT_PUBLIC_FEATURES_ON=""
ENV NEXT_PUBLIC_FEATURES_OFF=$NEXT_PUBLIC_FEATURES_OFF NEXT_PUBLIC_FEATURES_ON=$NEXT_PUBLIC_FEATURES_ON
RUN npm run build

FROM node:24-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/app/data/mizan.db
RUN mkdir -p /app/data && chown -R node:node /app
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
