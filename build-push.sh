#!/bin/bash
set -e

IMAGE="hqdu/dongvatv1:latest"
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Building Docker image..."
docker build -t "$IMAGE" "$ROOT"

echo "==> Pushing to Docker Hub..."
docker push "$IMAGE"

echo "==> Done. Image: $IMAGE"
echo "    Pull & run on server:"
echo "    bash <(curl -fsSL https://raw.githubusercontent.com/hqdubmt/webdongvat/master/restart.sh)"
