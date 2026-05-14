# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

# Build main app
RUN npm run build

# Compile seed script separately (rootDir is src/, seed needs its own compile)
RUN node node_modules/.bin/tsc \
    prisma/seed.ts \
    --target ES2020 \
    --module commonjs \
    --esModuleInterop \
    --resolveJsonModule \
    --skipLibCheck \
    --outDir /tmp/seed-out \
  && cp /tmp/seed-out/seed.js dist/seed.js \
  || echo "Seed compile skipped"

# Production stage
FROM node:20-alpine AS runner

RUN apk add --no-cache curl openssl

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

RUN npx prisma generate

COPY --from=builder /app/dist ./dist

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["/app/start.sh"]
