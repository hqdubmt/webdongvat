#!/bin/bash
set -e

IMAGE="hqdu/dongvatv1:latest"
ENV_FILE="/root/quangdu/deploy/.env"

echo "==> Pulling latest image..."
docker pull "$IMAGE"

echo "==> Stopping old container..."
docker rm -f dongvat 2>/dev/null || true

echo "==> Starting new container..."
docker run -d \
  --name dongvat \
  --add-host=host.docker.internal:host-gateway \
  -p 4000:3000 \
  --env-file "$ENV_FILE" \
  --restart unless-stopped \
  "$IMAGE"

echo "==> Waiting for container to start..."
sleep 8
docker logs --tail 20 dongvat

echo "==> Done. App running on http://localhost:4000"
