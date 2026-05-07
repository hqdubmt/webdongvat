#!/bin/bash
set -e

cd "$(dirname "$0")"

ENV_FILE="infra/docker/.env"

# Nhắc điền ANTHROPIC_API_KEY nếu còn trống
if grep -q "^ANTHROPIC_API_KEY=$" "$ENV_FILE"; then
  echo ""
  echo "⚠️  Chưa cấu hình ANTHROPIC_API_KEY trong $ENV_FILE"
  echo "   Tính năng AI sẽ không hoạt động cho đến khi bạn thêm key."
  echo "   Lấy key tại: https://console.anthropic.com"
  echo ""
fi

echo "🔨 Build và khởi động toàn bộ dịch vụ..."
cd infra/docker
docker compose --env-file .env up -d --build

echo ""
echo "⏳ Chờ các dịch vụ sẵn sàng (database, API, web)..."

# Chờ web container healthy
WAIT=0
until docker compose ps web | grep -q "healthy" || [ $WAIT -ge 120 ]; do
  sleep 5
  WAIT=$((WAIT + 5))
  echo "   ...${WAIT}s"
done

echo ""
if docker compose ps web | grep -q "healthy"; then
  echo "✅ Hệ thống đã sẵn sàng!"
else
  echo "⚠️  Timeout — kiểm tra logs: docker compose logs"
fi

echo ""
echo "🌐 Trang công khai:  http://localhost:3000"
echo "🔧 Trang quản trị:   http://localhost:3000/admin"
echo "📦 MinIO console:    http://localhost:9100"
echo ""
echo "Để xem logs: cd infra/docker && docker compose logs -f"
echo "Để dừng:     cd infra/docker && docker compose down"
