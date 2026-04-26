#!/usr/bin/env bash
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$ROOT/.astrotion-dev.log"

pkill -f "astro dev" 2>/dev/null || true
sleep 2

rm -f "$ROOT/.astro/data-store.json" "$ROOT/node_modules/.astro/data-store.json"

echo "==> starting astro dev (log: $LOG)"
( cd "$ROOT" && nohup npm run dev > "$LOG" 2>&1 < /dev/null &
  disown $! 2>/dev/null || true )

# Wait for ready
for i in $(seq 1 120); do
  if grep -qE "watching for file changes|\[ERROR\]" "$LOG" 2>/dev/null; then
    break
  fi
  sleep 5
done

grep -E "ready in|loaded [0-9]|watching|\[ERROR\]" "$LOG" | head
