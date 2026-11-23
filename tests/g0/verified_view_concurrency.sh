#!/usr/bin/env bash
set -euo pipefail

# Disposable PG17 test only: same UUID in eight simultaneous service requests.
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
pids=()
for n in $(seq 1 8); do
  (
    psql -Atq -v ON_ERROR_STOP=1 <<'SQL'
SET ROLE service_role;
SELECT public.slbi_record_verified_business_view(
  '70000000-0000-4000-8000-000000000008',
  '20000000-0000-4000-8000-000000000005',
  'business_detail',repeat('f',64)
);
SQL
  ) >"$tmp/$n.out" 2>"$tmp/$n.err" &
  pids+=("$!")
done

for pid in "\${pids[@]}"; do
  if ! wait "$pid"; then
    echo "G0-16 FAIL: concurrent request failed"
    cat "$tmp"/*.err
    exit 1
  fi
done

accepted="$(grep -h -x 't' "$tmp"/*.out | wc -l | tr -d ' ')"
rejected="$(grep -h -x 'f' "$tmp"/*.out | wc -l | tr -d ' ')"
if [[ "$accepted" != "1" || "$rejected" != "7" ]]; then
  echo "G0-16 FAIL: expected one accepted and seven idempotent denials; got $accepted/$rejected"
  cat "$tmp"/*.out
  exit 1
fi

# The sequential fixture counted one B view; eight concurrent requests
# using one new event must increase its counter to two, not nine.
views="$(psql -Atq -v ON_ERROR_STOP=1 -c \
  "SELECT views FROM public.businesses WHERE id='20000000-0000-4000-8000-000000000005'")"
logs="$(psql -Atq -v ON_ERROR_STOP=1 -c \
  "SELECT count(*) FROM public.analytics_logs WHERE id='70000000-0000-4000-8000-000000000008'")"
if [[ "$views" != "2" || "$logs" != "1" ]]; then
  echo "G0-16 FAIL: concurrent counter/log drift; views=$views logs=$logs"
  exit 1
fi

echo "PASS G0-16 isolated concurrency: 1/8 accepted, 7 duplicates denied, views=2, one event receipt"
