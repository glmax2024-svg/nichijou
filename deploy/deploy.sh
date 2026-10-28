#!/usr/bin/env bash
# 从本机部署到服务器：同步代码 → 服务器上安装依赖、同步表结构、构建 → 重启
# 必须在已与 origin/main 对齐的干净 main 上运行（先 PR、审核、合并）。
#   首次：  deploy/deploy.sh root@<IP> <域名> --env deploy/.env.production
#   之后：  deploy/deploy.sh nichijou-prod nichijou.ai
set -euo pipefail
HOST="${1:?用法: deploy.sh <user@host> <域名> [--env <文件>]}"
DOMAIN="${2:?缺少域名}"
ENV_FILE=""
[ "${3:-}" = "--env" ] && ENV_FILE="${4:?--env 后面要跟文件路径}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP=/srv/nichijou

cd "$ROOT"
git fetch origin main >/dev/null 2>&1 || true
branch="$(git rev-parse --abbrev-ref HEAD)"
head="$(git rev-parse HEAD)"
main="$(git rev-parse origin/main 2>/dev/null || true)"
if [ "$branch" != "main" ] || [ -z "$main" ] || [ "$head" != "$main" ]; then
  echo "✗ 只允许从已与 origin/main 对齐的 main 分支部署（当前 $branch @ ${head:0:7}）"
  echo "  请先把改动做成 PR，审核合并后再部署。"
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ 工作区不干净，拒绝部署。提交或清理后再试。"
  exit 1
fi


echo "▸ 同步代码到 $HOST:$APP"
rsync -az --delete \
  --exclude .git --exclude node_modules --exclude .next \
  --exclude '.env*' --exclude 'public/uploads/*/*' --exclude 'prisma/dev.db' \
  --exclude .claude --exclude .DS_Store --exclude promo \
  "$ROOT/" "$HOST:$APP/"

if [ -n "$ENV_FILE" ]; then
  echo "▸ 上传生产环境变量"
  scp -q "$ENV_FILE" "$HOST:$APP/.env"
fi

ssh "$HOST" APP="$APP" DOMAIN="$DOMAIN" 'bash -s' <<'REMOTE'
set -euo pipefail
cd "$APP"
test -f .env || { echo "✗ 服务器上没有 $APP/.env，首次部署请加 --env"; exit 1; }
chmod 600 .env && chown -R nichijou:nichijou "$APP"

echo "▸ 启动 Postgres"
docker compose -f deploy/docker-compose.prod.yml --env-file .env up -d --wait

echo "▸ 安装依赖 / 同步表结构 / 构建（几分钟）"
sudo -u nichijou bash -c 'set -a; . ./.env; set +a; npm ci --no-audit --no-fund && npx prisma db push --skip-generate && npm run build'

echo "▸ 配置 Caddy（HTTPS 证书自动申请）"
sed "s/__APP_DOMAIN__/$DOMAIN/" deploy/Caddyfile.template > /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy

echo "▸ 重启应用"
cp deploy/nichijou.service /etc/systemd/system/nichijou.service
systemctl daemon-reload
systemctl enable nichijou >/dev/null
systemctl restart nichijou

for i in $(seq 1 30); do
  curl -fsS -o /dev/null http://127.0.0.1:3000/ && { echo "✓ 应用已启动"; exit 0; }
  sleep 2
done
echo "✗ 应用 60 秒内没起来，最近日志："; journalctl -u nichijou -n 40 --no-pager; exit 1
REMOTE

echo "✓ 部署完成：https://$DOMAIN"
