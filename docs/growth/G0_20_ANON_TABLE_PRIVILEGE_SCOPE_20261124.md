# G0-20 — Anonymous table ACL least-privilege review candidate (2026-11-24)

**Scope: code and evidence only.** New authenticated/anon ACL hardening SQL is **NOT INSTALLED** on production. Owner broadly approved G0 engineering, but recovery and real device evidence gates are incomplete. G0 foundation **0/7 formally evidence-accepted**; GrowthOS master **0/10**.

## Verified read-only observations

- The historical repository file `supabase/migrations/20260302134437_fix_schema_permissions.sql` contains `GRANT ALL ON ALL TABLES/FUNCTIONS/SEQUENCES IN SCHEMA public TO anon, authenticated, service_role` and broad DEFAULT PRIVILEGES. **Do not replay it.**
- SELECT-only live PostgreSQL catalog check on 2026-11-24 showed `public.businesses`, `public.profiles`, and `public.leads` all have RLS enabled but retain anonymous **INSERT, UPDATE, DELETE** table grants.
- The current database has published-only public `businesses` read RLS, own-profile policies, and `SLBI legacy compatible enquiry insert` for anonymous visitor enquiries. Thus **grants are not evidence that RLS permits those writes**, and do not demonstrate exploitation. Source client continues to rely on anonymous `leads INSERT`.
- `reviews` has public read, no anon writes; `marketing_campaigns` and `slbi_lead_request_receipts` lack anon writes/read as appropriate. Managed `storage.buckets` was observed to have broad grants with RLS enabled; **excluded** from this candidate because storage is managed separately.
- Official Supabase API security documentation states grants select reachable database objects while RLS controls rows: https://supabase.com/docs/guides/api/securing-your-api .

## Safe, narrowly scoped proposal

The **unapplied review-only** `docs/growth/g0/candidates/ANON_SCOPED_LEAST_PRIVILEGE_REVIEW_ONLY.sql` proposes revoking exactly eight anonymous table-level DML permissions:
- `businesses` — INSERT/UPDATE/DELETE
- `profiles` — INSERT/UPDATE/DELETE
- `leads` — UPDATE/DELETE

It **preserves** `anon SELECT` on public businesses, `anon INSERT` on leads, authenticated owner app grants, service-role grants, search/Nearby, and every RLS policy. Fail-closed preflight checks the three tables/RLS, the exact legacy enquiry policy and required public/vendor grants. Postchecks verify expected grants were removed and allowed operations remain; if any grant is inherited via `PUBLIC`, it intentionally fails rather than claiming hardening. No default privilege change, provider/OAuth activation, payment or wallet modification.

`tests/g0/anon_acl_boundary.sql` runs a synthetic PG17 fixture only inside `BEGIN ... ROLLBACK`. The test reproduces broad grants plus approved-business read, public enquiry and signed-in RLS, then applies the candidate twice, checks idempotence, anonymous positive public read and anonymous lead submission, rejects business/profile writes and lead delete, and confirms existing rows unchanged. New G0 Foundation CI `anon_acl` domain runs the test. `docs/growth/g0/exit/G0_20_ANON_ACL_SCOPE_READ_ONLY.sql` offers a repeatable, no-PII live catalog snapshot.

## Release constraints and next work

- **Not live security remediation**. Before any production SQL: verify fresh owner archive `slbi-20261124T143408Z-bZVxRm8R` was *actually* restored on an isolated compatible PG17 target, and the encrypted archive copied to a different physical owner-controlled drive; original new archive decode/checksum already PASS. Owner has not supplied fresh restore/copy evidence yet. Do not request another backup.
- Test real signed-in vendor A/B/admin and anonymous browser paths against isolated restored environment, exact current policy/grant drift, contractual legacy enquiry `INSERT` and owner businesses/profiles; scope maintenance window, exact new versioned migration and forward recovery.
- Do not touch `storage.buckets`, default privileges, historical migration ledger, 3 public anon SECURITY DEFINER RPCs, view counter, financial tables or policies in this candidate.
- G0-01 still has 47 live migrations (34 exact + 13 historical catalog-evidence), 88 repository SQL unmatched; this specific risk disposition is not full migration equivalence. G0-03 chat definer candidate from PR #178 is staged but not applied, as are view counter candidates. G0-02 lead consent, G0-04 billing, G0-05 marketing, G0-06 physical GPS, G0-07 signoff remain open.

## Full next-chat prompt

```text
Continue SLBusinessIndex GrowthOS in Tamil. Repo Victor-dev-03-cmd/sl_business_index, production https://www.slbusinessindex.com. FIRST fetch main docs/growth/HANDOFF_LATEST.md fully, AGENTS.md, docs/growth/G0_20_ANON_TABLE_PRIVILEGE_SCOPE_20261124.md, G0 Foundation ledger and master checklist. Owner already created fresh 2026-11-24 AES256 encrypted DB archive ~/slbi-private-backups/slbi-20261124T143408Z-bZVxRm8R with decode/checksum OK and script exit 0; do NOT ask again for new backup. New archive actual isolated restore and physically independent verified encrypted copy remain OPEN; no production security migrations until recovery evidence, exact scope, current preflight, maintenance, rollback and signed-in QA. G0 Foundation evidence accepted 0/7, master GrowthOS 0/10; blanket owner approval authorizes audits and safe code PRs but does not attest gates. Prior PR #178 G0-03 chat tenant candidate merged SHA a526902637f4403ca4496766ce86a0460dc250ec, 15/15 CI jobs PASS and Vercel dpl_AfYQtoNRN1X1HdMmYr726aiJnMyL READY with exact SHA www alias; live chat RPC unchanged. Current G0-20 branch growth/g0-20-anon-acl-guard-candidate-20261124 adds reviewed, unapplied eight-grant anon least-privilege SQL candidate in docs/growth/g0/candidates, SELECT-only audit in docs/growth/g0/exit, synthetic PostgreSQL17 test and G0 CI anon_acl domain, and this report/complete handoff. On 2026-11-24 production SELECT-only snapshot anon has INSERT UPDATE DELETE privileges on public.businesses,public.profiles,public.leads with RLS on; this does NOT establish RLS bypass. Preserve public approved business reads, anon leads INSERT, auth owner paths, service role; no storage.buckets/default privilege changes, no old migration replay. Check PR final exact head and ALL GitHub CI green; repair if needed, then squash merge and verify exact Vercel READY main SHA / www alias / aliasError=null; record final release evidence in merged PR body. No production DDL/DML applied. Next review G0-01 88 SQL lineage/13 history, G0-03 public RPC abuse and real chat, G0-02 consent, billing/marketing, actual signed-in vendor A/B and desktop GPS. Every GitHub PR updates docs/growth/HANDOFF_LATEST.md and full copy/paste prompt in same PR. Report actual live vs code-only separately.
```
