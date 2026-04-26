#!/usr/bin/env bash
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INTEGRATION="$ROOT/packages/astro-integration"
LOG="$ROOT/.astrotion-build.log"

echo "==> rebuild integration package"
( cd "$INTEGRATION" && npm run build 2>&1 | tail -3 )

echo "==> clear data stores"
rm -f "$ROOT/.astro/data-store.json" "$ROOT/node_modules/.astro/data-store.json"

echo "==> root astro build (log: $LOG)"
( cd "$ROOT" && npm run build > "$LOG" 2>&1 )
ROOT_EXIT=$?
echo "==> root build exit=$ROOT_EXIT"

echo "==> debug + error grep:"
grep -E "astrotion debug|page\(s\) built|Build complete|Could not process|\[ERROR\]|Build failed" "$LOG" | head -25

echo "==> tail of build log:"
tail -5 "$LOG"
