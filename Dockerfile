# ─── Stage 1: Build API ────────────────────────────────────────────────────
FROM node:20-alpine AS api-builder
WORKDIR /app/api

COPY apps/api/package*.json ./
COPY apps/api/prisma ./prisma/
RUN npm ci
RUN npx prisma generate

COPY apps/api/tsconfig.json ./
COPY apps/api/src ./src/
RUN npm run build

# ─── Stage 2: Web dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS web-deps
RUN apk add --no-cache libc6-compat
WORKDIR /app/web
COPY apps/web/package*.json ./
RUN npm ci --legacy-peer-deps

# ─── Stage 3: Build Web ─────────────────────────────────────────────────────
FROM node:20-alpine AS web-builder
WORKDIR /app/web
COPY --from=web-deps /app/web/node_modules ./node_modules
COPY apps/web/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 4: Final combined image ─────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_INTERNAL_URL=http://localhost:3001

# --- API runtime ---
WORKDIR /app/api
COPY apps/api/package*.json ./
COPY apps/api/prisma ./prisma/
RUN npm ci --only=production
RUN npx prisma generate
COPY --from=api-builder /app/api/dist ./dist
COPY apps/api/start.sh ./start.sh
RUN chmod +x ./start.sh

# --- Web runtime ---
WORKDIR /app/web
COPY --from=web-builder /app/web/.next/standalone ./
COPY --from=web-builder /app/web/.next/static ./.next/static
COPY --from=web-builder /app/web/public ./public

# --- Startup script ---
COPY docker-start.sh /docker-start.sh
RUN chmod +x /docker-start.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["/docker-start.sh"]
