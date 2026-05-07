#!/bin/sh
set -e

echo "[startup] Running migrations..."
npx prisma migrate deploy

echo "[startup] Checking species count..."
COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.species.count()
  .then(n => { process.stdout.write(String(n)); return p.\$disconnect(); })
  .catch(() => process.stdout.write('0'));
" 2>/dev/null || echo "0")

if [ "${COUNT}" = "0" ] && [ -f "/app/dist/seed.js" ]; then
  echo "[startup] Database empty — seeding..."
  node dist/seed.js && echo "[startup] Seed done." || echo "[startup] Seed failed, continuing."
else
  echo "[startup] Database has ${COUNT} species, skipping seed."
fi

echo "[startup] Starting API server..."
exec node dist/index.js
