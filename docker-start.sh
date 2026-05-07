#!/bin/sh
set -e

# Start API (runs migrations + seed then starts server)
cd /app/api && ./start.sh &
API_PID=$!

# Wait for API to be healthy (max 90s)
echo "[init] Waiting for API..."
i=0
while [ $i -lt 90 ]; do
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        echo "[init] API ready"
        break
    fi
    if ! kill -0 $API_PID 2>/dev/null; then
        echo "[error] API process died unexpectedly"
        exit 1
    fi
    sleep 3
    i=$((i + 3))
done

# Start web
cd /app/web
PORT=3000 HOSTNAME=0.0.0.0 node server.js &
WEB_PID=$!

echo "[init] Both services started (API: $API_PID, Web: $WEB_PID)"

# Relay SIGTERM/SIGINT to both children
trap "kill $API_PID $WEB_PID 2>/dev/null; exit 0" TERM INT

# Keep alive until either process exits
wait $API_PID $WEB_PID
