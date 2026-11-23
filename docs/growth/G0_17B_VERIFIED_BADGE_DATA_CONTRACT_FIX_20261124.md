# G0-17B — Verified Business blue tick production data-contract fix
Date: 2026-11-24 Asia/Colombo | baseline `b023ea61896ebfaf9c8a10ffd288d06a62dcb5ee`.

## Exact cause — verified from live production read-only aggregates
Previous UI on `app/business/[slug]/BusinessDetailsClient.tsx` required:
```ts
business.status === 'approved'
&& business.can_show_badge === true
&& (business.is_verified === true || business.verification_status === 'verified')
```

**This condition was incompatible with the authoritative admin approval flow** in `app/actions/verifications.ts` and `supabase/migrations/20260501100000_add_verification_status_to_businesses.sql`. Both set `is_verified=true` and the trigger syncs `businesses.verification_status='approved'`; neither reliably sets `can_show_badge=true`. The legacy flag alone is also not reliable proof of approved verification.

Live Supabase **read-only aggregated evidence** prior to fix:
- 23 approved business listings.
- 4 listings with `status='approved'`, `is_verified=true` and `verification_status='approved'`; **all 4 wrongly hidden** by legacy `can_show_badge=false`.
- 1 approved listing with `can_show_badge=true` but no approved verification; **must NOT gain a verified seal**.
- No customer data, business names, IDs, attachments or private verification documents were exported; no production writes.
- Reproducible aggregation: [G0-17B SELECT-only audit](g0/exit/G0_17B_VERIFICATION_BADGE_DRIFT_READ_ONLY.sql).

The previous badge SVG design from PR #165 was on Vercel production deployment at baseline `b023ea6...`, READY. The primary issue was the false eligibility condition, not a missing GitHub merge. A clearer blue circle with a high-contrast centered white check has been retained as robust display art.

## Implemented correction
1. `lib/business-verification.ts`: centralized *business-level*, fail-closed rule:
```ts
business.status === 'approved'
&& business.is_verified === true
&& ['approved','verified'].includes(business.verification_status.trim().toLowerCase())
```
The `can_show_badge` legacy flag is ignored for verification entitlement. Listing approval, registration alone, owner-profile verification, unchecked flag, pending/rejected business do not produce a blue seal.
2. `app/business/[slug]/BusinessDetailsClient.tsx` calls the helper for `verified`; it keeps the separate `Registration provided` building indicator for unverified businesses. Server `page.tsx` already fetches and maps the source columns and needs no database mutation.
3. `app/components/VerifiedBadge.tsx`: simpler guaranteed-visible blue circular background (#1685F5), larger centered white SVG tick, decorative aria-hidden beside readable text.
4. Bun positive/negative fixtures `tests/business/verified-business-gate.test.mjs` explicitly mirror four live classes: true approved verification with legacy badge=false -> YES, legacy verified spelling -> YES, false positives/flag-only -> NO, all non-approved listings -> NO. Existing static UI regressions updated; G0 CI `backup-copy-contract` runs Bun actual helper test.

## Acceptance and remaining limitations
- Source-code/GitHub CI alone doesn't prove production frontend is live. After CI green + merge, verify Vercel production deployment has matching commit SHA and READY state; ideally check a public verified business profile with actual browser rendering. No manual duplicate preview deployments.
- Production data changes **not required**. It would be unsafe to bulk set all `can_show_badge` values; user data is unchanged.
- This fix **does not activate the G0-16 verified view-counter SQL** and does not alter private/public Analytics flags.
- G0-17 staging security readiness remains **blocked** until approved isolated staging, fresh independent-passphrase GPG backup, isolated restore, verified separate physical drive copy, controlled migration, consent, and A/B real-device QA. Read-only SQL is not a release gate.
- Production legacy `increment_business_views(uuid)` remains anonymously callable and new service-only verified-counting RPC is not yet installed. A feature flag alone cannot secure the legacy endpoint.
- G0 Foundation owner-accepted 0/7; GrowthOS master 0/10. G1 not started. Two review-cache mismatches and unreliable desktop GPS remain open.

## Next-chat handoff prompt
```text
Continue SLBusinessIndex GrowthOS in Tamil. You have connected GitHub/Vercel/Supabase; DO THE IMPLEMENTATION, do not merely paste code. Repository Victor-dev-03-cmd/sl_business_index. First verify latest main commit and PR #G0-17B status using GitHub, exact CI and Vercel production READY SHA. Read AGENTS.md, docs/growth/G0_17B_VERIFIED_BADGE_DATA_CONTRACT_FIX_20261124.md, docs/growth/G0_17_BADGE_AND_VIEW_CUTOVER_READINESS_20261124.md, docs/growth/G0_16_VERIFIED_VIEW_COUNTER_CANDIDATE_20261123.md, docs/growth/GROWTH_ENGINE_RELEASE_CHECKLIST.md, docs/growth/g0/exit/G0_FOUNDATION_EXIT_LEDGER_20261123.json. Latest G0-17B root cause: production read-only aggregate 23 approved, 4 approved+is_verified=true+verification_status='approved' but can_show_badge=false; old UI incorrectly required can_show_badge=true and verification_status='verified'. One listing can_show_badge=true without verified status. Fix centralizes eligibility in lib/business-verification.ts: approved+is_verified=true+verification_status in ('approved','verified'), ignoring legacy flag; tests ensure false positives don't gain blue tick. VerifiedBadge is guaranteed-visible blue circle/white check; Business Details uses helper. Ensure CI, Vercel production deployment, ideally browser smoke. No production DB edits made/needed. G0-17 cutover readiness remains blocked: production new slbi_record_verified_business_view not installed; legacy increment_business_views has anon execute, and requires independent owner-approved SQL release, backup, isolated restore/external drive, consent, physical A/B QA. Never auto-enable flags or paid resources. G0 foundation 0/7 owner accepted; GrowthOS master 0/10; G1 blocked. Continue next G0 evidence task after safely finishing the badge fix, update AGENTS/checklist and copyable next-chat prompt.
```
