#!/usr/bin/env bash
set -euo pipefail
# Only run on a disposable CI database after a successful forward release.
case "${1:-}" in
  lead) file=LEAD; expected='G0 definition drift' ;;
  review) file=REVIEW; expected='G0 internal schema already exists' ;;
  billing) file=WALLET; expected='G0 definition drift' ;;
  *) exit 2 ;;
esac
log=$(mktemp)
trap 'rm -f "$log"' EXIT
if psql -v ON_ERROR_STOP=1 --single-transaction -f "docs/growth/g0/release/${file}_FORWARD_BODY.sql" >"$log" 2>&1; then
  echo "Repeated forward release unexpectedly succeeded"; exit 1
fi
grep -F "$expected" "$log" >/dev/null || { cat "$log"; exit 1; }
echo "PASS: $1 forward release refuses changed baseline"
