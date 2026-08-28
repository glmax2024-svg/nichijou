#!/usr/bin/env bash
set -euo pipefail
PID_FILE=/root/autodl-tmp/logs/nichijou.pid
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" || true
    echo "stopped pid=$PID"
  fi
  rm -f "$PID_FILE"
else
  pkill -f "next start.*6008" 2>/dev/null || true
  pkill -f "next start.*6006" 2>/dev/null || true
  echo "no pid file; tried pkill"
fi
