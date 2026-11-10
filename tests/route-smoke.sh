#!/usr/bin/env bash
set -euo pipefail

# Isolated anonymous route checks. Authenticated E2E still requires Preview tests.
npm run start -- -p 3099 >/tmp/slbi-next-smoke.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
for attempt in $(seq 1 35); do
  if curl --max-time 2 -s -o /dev/null "http://127.0.0.1:3099/login"; then
    break
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    cat /tmp/slbi-next-smoke.log
    echo "Next.js failed to start"
    exit 1
  fi
  sleep 1
done

for path in /admin/billing /vendor/billing /register-business /admin/billing/hybrid /vendor/billing/hybrid; do
  headers=$(curl --max-time 10 -sS -D - -o /dev/null "http://127.0.0.1:3099$path")
  status=$(printf '%s\n' "$headers" | head -n 1 | tr -d '\r')
  case "$status" in
    *" 302 "*|*" 303 "*|*" 307 "*|*" 308 "*) ;;
    *) echo "FAIL $path: expected redirect, got $status"; exit 1 ;;
  esac
  location=$(printf '%s\n' "$headers" | tr -d '\r' | grep -i '^location:' | tail -n 1)
  if [[ "$location" != *"/login?next="* ]]; then
    echo "FAIL $path: expected login redirect, got $location"
    exit 1
  fi
  echo "PASS $path requires login"
done

status=$(curl --max-time 10 -sS -o /dev/null -w '%{http_code}' \
  -X POST "http://127.0.0.1:3099/api/billing/upgrade-request" \
  -H 'Content-Type: application/json' \
  --data '{"planId":"10000000-0000-4000-8000-000000000002","billingCycle":"monthly"}')
if [[ "$status" != "401" ]]; then
  echo "FAIL anonymous billing API: expected 401, got $status"
  exit 1
fi
echo "PASS unauthenticated billing API returns 401"


# Fail-closed: until both independent DB credentials and the feature flags
# are explicitly configured, no hybrid billing endpoint may operate.
for endpoint in /api/billing/hybrid /api/admin/billing/hybrid; do
  code=$(curl --max-time 10 -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:3099$endpoint")
  if [[ "$code" != "503" ]]; then
    echo "FAIL $endpoint: expected disabled service 503, got $code"
    exit 1
  fi
  echo "PASS $endpoint fails closed while hybrid billing is disabled"
done
