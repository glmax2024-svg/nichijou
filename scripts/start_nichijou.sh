#!/usr/bin/env bash
set -euo pipefail
ROOT="${NICHIJOU_ROOT:-/root/autodl-tmp/repos/nichijou}"
cd "$ROOT"

if command -v docker >/dev/null 2>&1; then
  if [ -f docker-compose.yml ]; then
    docker compose up -d postgres 2>/dev/null || docker-compose up -d postgres 2>/dev/null || true
  fi
fi

export PORT="${PORT:-6008}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"

mkdir -p /root/autodl-tmp/logs
nohup npm run start -- -H 0.0.0.0 -p "$PORT" \
  > /root/autodl-tmp/logs/nichijou.log 2>&1 &
echo $! > /root/autodl-tmp/logs/nichijou.pid
echo "nichijou started pid=$(cat /root/autodl-tmp/logs/nichijou.pid) port=$PORT"
