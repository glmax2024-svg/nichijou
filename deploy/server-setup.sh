#!/usr/bin/env bash
# 新服务器一次性初始化（Ubuntu 22.04/24.04，root 执行）
#   用法：ssh root@<IP> 'bash -s' < deploy/server-setup.sh <域名>
set -euo pipefail
DOMAIN="${1:?用法: server-setup.sh <域名>}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg rsync ufw debian-keyring debian-archive-keyring apt-transport-https

# Node.js 24
if ! node -v 2>/dev/null | grep -q '^v24'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

# Docker（只用来跑 Postgres）
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

# Caddy
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

# next build 比较吃内存，小机器加 2G swap 防止 OOM
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 运行用户与目录
id nichijou >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin nichijou
mkdir -p /srv/nichijou && chown -R nichijou:nichijou /srv/nichijou

# 防火墙：只开 SSH / HTTP / HTTPS
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable

echo "✓ 初始化完成：node $(node -v)，域名 $DOMAIN"
