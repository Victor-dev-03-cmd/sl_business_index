#!/usr/bin/env bash
set -euo pipefail
# Synthetic fixture only. Two reviews on same business, separate SQL sessions.
psql -v ON_ERROR_STOP=1 <<'SQL' &
BEGIN;
INSERT INTO public.reviews(id,business_id,user_name,rating,comment,is_approved,moderation_status)
VALUES('11112222-3333-4444-8555-666677778888','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Parallel A',5,'A',true,'approved');
SELECT pg_sleep(1);
COMMIT;
SQL
p1=$!
sleep .2
psql -v ON_ERROR_STOP=1 <<'SQL' &
BEGIN;
INSERT INTO public.reviews(id,business_id,user_name,rating,comment,is_approved,moderation_status)
VALUES('99998888-7777-4666-8555-444433332222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Parallel B',1,'B',true,'approved');
COMMIT;
SQL
p2=$!
wait "$p1"; wait "$p2"
psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND rating=3 AND reviews_count=2) THEN RAISE EXCEPTION 'parallel aggregate is stale'; END IF;
END $$;
\echo 'PASS: concurrent reviewed-row inserts'
SQL
