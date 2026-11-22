# G0-01 — Growth Intelligence Core V1 foundation evidence audit
Date: 2026-11-22 (Asia/Colombo) | Status: **IN PROGRESS / BLOCKED ON RECONCILIATION**.
Owner authorized starting G0 in the current chat and requested a copyable next-chat prompt after every development/production milestone. This is a read-only evidence checkpoint, not a product release. No app source, live data, DDL, provider configuration, credentials or flags have been changed. No paid model generation, preview or test infrastructure created. Do not mark G0-01 or any master release gate complete yet.

## 1. Inputs and scope
Read main AGENTS.md, [master handoff](SLBI_MASTER_IMPLEMENTATION_HANDOFF.md), [execution brief](GROWTH_ENGINE_EXECUTION_HANDOFF_V1_20261122.md), [release checklist](GROWTH_ENGINE_RELEASE_CHECKLIST.md), [Growth foundation](GROWTH_INTELLIGENCE_V1_FOUNDATION.md) and [P2 ledger](p2/IMPLEMENTATION_STATUS_LIVE.md). Authoritative audit snapshot: `de3e65eda2d38f195bacabed4e67eee86a8ebcbc`. Historical documentation is superseded by the read-back below where contradicted. Original six engines/eight algorithm identities and approved G0–G9 sequence unchanged. G0 is not a new GeoRank rewrite.

## 2. Deployment and CI (exact commit evidence)
| Item | Observation |
|---|---|
| Source | main de3e65eda2d38f195bacabed4e67eee86a8ebcbc, previous app change 299a3a3f00124a9a8b395a1bc19f95030c39e2fc |
| Production | Vercel dpl_C75MMgwHM4e4uUAkGuu7LBRdV9yu READY for de3e65eda2d38f195bacabed4e67eee86a8ebcbc; www.slbusinessindex.com listed in deployment aliases |
| Previous app release | Vercel dpl_CanFY4Ga6WJzgJW9F7KtoF9Uf6s9 READY for 299a3a3... |
| GitHub Actions | [Current audit SHA run 45036966166](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/45036966166) failed; previous [299a3a3 run 45029756947](https://github.com/Victor-dev-03-cmd/sl_business_index/actions/runs/45029756947) also failed. Job Typecheck and production build stopped at mobile source-contract step. |
| Positive evidence | CI SSR cookie round-trip passed; combined GeoRank/search/semantic/attribution/ingestion/lead/vendor contracts step logged 124 passed, 0 failed. Prior exact P2-37 marketing suite 142/142 and TypeScript passed independently (historical). |
| Negative evidence | tests/publicMobileHomeReference.test.mjs: 6 pass, 2 fail; downstream Nearby mobile, typecheck/build steps not reached in these CI runs. Vercel READY is not a CI pass. |

Two failing assertions with current-source comparison:
1. Test at line 48, “Real mobile Iconsax menu links exist…” expects an inline Navbar href="/notifications" aria-label="View notifications". Navbar renders NotificationBell; component uses signed-out link accessible name “Notifications” and a signed-in button with unread count and panel. Likely obsolete test contract, not established functional regression. Validate both states/accessibility; update assertions to read the real component, not simply delete the assertions.
2. Test at line 154, “Reference mobile greeting…” expects exact className="hidden shrink-0 sm:block". Current Navbar contains desktop wrapper with additional lg:mr-2 and LiveCounter wrapper data-slbi-desktop-live="true" className="hidden shrink-0 sm:inline-flex", per owner mobile-only removal. Validate small/mobile and desktop, greeting personalization and notification/theme/profile retention. Avoid mutating UI merely to satisfy brittle literal.
Remediation: reviewed test-only development branch, ensure meaningful current contracts, run full workflow with exact SHA, verify production readiness after approved integration; no blanket CI bypass. This audit has not made that code change.

## 3. Route and source-of-truth matrix (initial)
| Domain | Existing UI / API / service | Live source / authorization | Growth reuse and constraints |
|---|---|---|---|
| Owner identity and businesses | /vendor/my-businesses, dashboard, gallery-services; SSR auth and existing profile guards | Supabase profiles and businesses; owner_id; public only approved listing predicate, staff/owner scoped policies; protection triggers before writes | Server resolver with verified business ownership; distinguish public approved facts from private owner fields and editable/unverified facts |
| Events | /api/analytics/log, lib/growth/ingestion-contract.ts, attribution.ts, activity-trend.ts, insight-comparison.ts, /vendor/insights | analytics_logs; slbi_record_growth_event service-only, owner/admin read policies | No direct anon/auth insert; separate trusted server ingestion provenance vs legacy events; no unique-user/conversion claim |
| Leads | /api/leads/submit, lib/growth/lead-contract.ts, lead-followups.ts, /vendor/leads | leads, lead_notes, lead_followups, slbi_submit_verified_lead service-only | Existing legacy direct insert retained; do not label all leads verified; CRM status is not settled revenue |
| Reputation | /api/reviews/submit, /vendor/reviews, public detail, admin moderation | reviews + review_replies; approved review visibility, author/staff scopes; owner-linked replies | Approved-review aggregate should be canonical; cached business rating/count currently inconsistent |
| QR | /vendor/qr-code | qr_inventory, existing policies | Inventory is not scanned count or revenue; event semantics needed |
| Credits and access | /vendor/growth, /vendor/billing; growth_wallet_status; lib/marketing/pro-access-server.ts | Supabase growth_credit_plans/wallets/ledger/actions, growth_entitlements | Wallet is source for current SLBI credits; trusted verified and unexpired entitlement, never client plan or QA flag alone |
| Hybrid billing | /api/billing/hybrid, lib/billing/postgres.ts, /vendor/billing/hybrid | Intended Neon billing.published_plans/account_snapshot/cancel_request; owner checked on Supabase first; BILLING_DATABASE_URL vs settlement URL distinct | Connector-visible project exists but billing schema not established by read-back; do not assume operational or create tables |
| Marketing | /vendor/marketing, /vendor/marketing/campaigns, /vendor/marketing/brand, /vendor/marketing/captions, /vendor/marketing/design/puter-lab, /vendor/marketing-engine/* | marketing_campaigns/revisions, social_brand_profiles, marketing_ai_drafts/credit_jobs, marketing_connections/oauth_intents/secrets and private storage; owner scopes, verified Pro and rollout | Reuse existing safe workspace, saved PNG, policy and credit boundaries; no new provider activation |
| Learning/discovery | Existing public search/Nearby, search relevance lab; PostGIS/vector and reviewed beta | Existing search schema/extensions, source/quality gates | Preserve current ranking and fallback, no new ML training |
| Growth intelligence | /vendor/growth presently wallet; lib/growth pure helpers | No newly authorized GrowthScore, shared context or workflow runtime | G1 after G0 reviewed; preserve wallet; no fake scores or mock production metrics |

## 4. Migration history — reproduce and reconcile before any DDL
Git tree contains 115 SQL filenames under supabase/migrations. Supabase live migration ledger contains 47 entries. Exact filename version-prefix matches: 20; live-only version IDs: 27; repo-only version IDs: 95. These are raw version comparisons, NOT proof of unapplied or missing schema; historical baseline, renamed SQL, manually applied migrations and staging-only proposals may differ. Never blindly apply 95 repo-only files, reset the database or edit the live migration ledger to make counts match. Review SQL content/checksums, corresponding names, actual tables/RPC definitions and migration history; classify applied-equivalent, intentional baseline/staging, genuinely missing, unknown. Document reviewed drift. No migration executed in this audit.

### Live-only version IDs (needs mapping)
- 20261110041516 growth_security_guards
- 20261111071341 semantic_v3_research_foundation
- 20261111071708 semantic_v3_native_review
- 20261111072328 semantic_v3_multimodel_dimensions
- 20261111121118 vendor_notification_preferences_owner_scoped_v1
- 20261111121230 private_verification_documents_owner_path_v1
- 20261111130737 fix_verification_upload_business_owner_path_v2
- 20261112130101 nearby_v3_readable_business_addresses
- 20261112132525 business_news_editorial_formats
- 20261112132935 business_news_feed_indexes
- 20261112194811 p0_business_logos_owner_isolation
- 20261114104216 p2_marketing_global_foundation_coming_soon_v1
- 20261114132728 p2_campaign_planner_owner_rls_revision_audit_v1
- 20261114134136 p2_campaign_planner_basic_marketplace_live_v1
- 20261114144023 p2_campaign_planner_v2_editable_brief_archive
- 20261115084040 p2_cloudflare_flux2_klein4b_model_allowlist
- 20261115100554 p2_poster_gemini_voice_quota_20261115
- 20261116182801 p2_caption_internal_qa_credit_foundation_20261116
- 20261116195104 p2_internal_qa_voice_brief_quota_override_20261116
- 20261116195507 p2_poster_gemini_shared_qa_quota_20261117
- 20261117184045 p2_caption_planner_private_poster_asset_ref
- 20261117185250 p2_campaign_asset_insert_column_grant
- 20261117185922 p2_30_campaign_planner_authenticated_owner_grants_20261118
- 20261117190516 p2_31_restore_campaign_column_grants_20261118
- 20261117190546 p2_32_restore_owner_campaign_column_allowlist_20261118
- 20261120103549 fcm_dispatch_enable_scheduler_extensions
- 20261120103628 fcm_dispatch_direct_http_transport

### Repo-only version IDs / files (needs mapping)
- 20260302085824_initial_system_setup.sql
- 20260302132537_add_website_fields_to_businesses.sql
- 20260302133423_clean_up_website_fields.sql
- 20260302134437_fix_schema_permissions.sql
- 20260302135111_add_email_to_profiles_and_backfill.sql
- 20260303091637_add_notifications_table.sql
- 20260303095623_fix_nearby_search_and_permissions.sql
- 20260303102713_migrate_to_postgis_geography.sql
- 20260303103238_align_nearby_rpc_parameters.sql
- 20260303103956_upgrade_search_to_trigram.sql
- 20260303105239_advanced_full_text_search_system.sql
- 20260303110721_optimize_broad_search_logic.sql
- 20260303123950_fix_nearby_rpc_return_type.sql
- 20260305171500_add_categories_table.sql
- 20260305181500_force_refresh_categories.sql
- 20260308110000_vendor_dashboard_tables.sql
- 20260308120000_admin_enhancements.sql
- 20260308130000_add_facilities_to_businesses.sql
- 20260308140000_add_view_increment_rpc.sql
- 20260308150000_update_nearby_rpc_with_verified.sql
- 20260308160000_vendor_admin_enhancements.sql
- 20260309010000_add_verification_to_profiles.sql
- 20260309020000_update_nearby_rpc_with_verification_status.sql
- 20260309030000_fix_verifications_table.sql
- 20260309040000_ensure_verification_bucket.sql
- 20260309050000_disable_rls_on_buckets.sql
- 20260309060000_fix_profiles_policy.sql
- 20260309070000_add_featured_to_businesses.sql
- 20260310080000_create_featured_listings_table.sql
- 20260310090000_admin_notifications_triggers.sql
- 20260310100000_subscription_plans_and_announcements.sql
- 20260311100000_advanced_plans_and_notifications.sql
- 20260311110000_update_nearby_rpc_with_plan_features.sql
- 20260311120000_cache_business_features.sql
- 20260311130000_default_basic_subscription.sql
- 20260311150000_sync_featured_table.sql
- 20260311160000_comprehensive_billing_fix.sql
- 20260311170000_fix_user_trigger_role.sql
- 20260312113000_create_analytics_logs.sql
- 20260312120000_site_settings.sql
- 20260313060000_appearance_settings.sql
- 20260313100000_theme_colors.sql
- 20260313110000_reviews_sentiment.sql
- 20260313120000_extra_site_settings.sql
- 20260315123000_add_avatar_url_to_profiles.sql
- 20260316000000_create_promotions_table.sql
- 20260316100000_fix_logo_upload_permissions.sql
- 20260323010000_qr_inventory_system.sql
- 20260323020000_add_advanced_feature_access_to_plans.sql
- 20260323030000_add_dynamic_features_to_plans.sql
- 20260323040000_fix_storage_and_settings_rls.sql
- 20260323050000_add_detailed_address_to_businesses.sql
- 20260323060000_fix_user_sign_up_permanently.sql
- 20260323070000_consolidated_user_triggers.sql
- 20260323080000_robust_auth_trigger_sync.sql
- 20260323090000_add_category_images_bucket.sql
- 20260323100000_fix_qr_inventory_policies.sql
- 20260323110000_recreate_qr_policies.sql
- 20260329103000_add_slug_to_businesses.sql
- 20260329113000_update_nearby_rpc_category_filter.sql
- 20260329120000_fix_nearby_rpc_category_filter_case.sql
- 20260329121000_fix_nearby_rpc_robust_category.sql
- 20260329123000_optimize_nearby_rpc.sql
- 20260329130000_businesses_rls_policies.sql
- 20260329140000_unify_nearby_rpc.sql
- 20260329141000_fix_nearby_rpc_columns.sql
- 20260330014200_update_nearby_rpc_with_detailed_address.sql
- 20260330020000_add_city_and_update_nearby_search.sql
- 20260330030000_add_global_search_suggestions_rpc.sql
- 20260330040000_create_contact_submissions.sql
- 20260331000000_create_testimonials_table.sql
- 20260331100000_testimonials_storage.sql
- 20260430110000_add_business_news_table.sql
- 20260430120000_update_business_news_fields.sql
- 20260430130000_add_news_images_and_storage.sql
- 20260501100000_add_verification_status_to_businesses.sql
- 20260502100010_add_user_safety_and_moderation_v2.sql
- 20260502110000_add_verification_details.sql
- 20260502120000_add_business_audit_trail.sql
- 20260502120010_update_statuses.sql
- 20260528000000_add_main_category_groups.sql
- 20260529000000_fix_signup_trigger.sql
- 20260605000000_pg_trgm_fuzzy_search.sql
- 20261009000000_push_subscriptions.sql
- 20261110010000_growth_os_credit_foundation.sql
- 20261110011000_growth_security_guards.sql
- 20261112173000_nearby_v3_readable_business_addresses.sql
- 20261112190000_business_news_editorial_formats.sql
- 20261112191000_business_news_feed_indexes.sql
- 20261115091000_p2_cloudflare_flux2_klein4b_model_allowlist.sql
- 20261115094500_p2_poster_gemini_voice_quota.sql
- 20261117210000_p2_caption_planner_private_poster_asset_ref.sql
- 20261118003000_p2_campaign_asset_insert_column_grant.sql
- 20261118004500_p2_31_restore_campaign_column_grants.sql
- 20261118005000_p2_32_restore_owner_campaign_column_allowlist.sql

## 5. Security / grants / RPC verification, partial G0-03
Catalog query (pg_class/pg_policy/has_table_privilege) checked 25 named tables including profiles, businesses, analytics_logs, leads/notes/followups, reviews/replies, QR, credit wallets/plans/actions/ledger/entitlements, invoices/subscriptions, campaign/revisions, brand, drafts/jobs, connections/secrets/intents/rollouts. All 25 have RLS enabled. This does not prove policies correct or runtime authorization.
- Public approved business selection and owner insert/update RLS; staff/admin management. Broad table/column grants exist for businesses and profiles, including role/status fields. Live BEFORE guards protect role escalation and business approval; need synthetic negative tests, do not infer broad grants alone = exploit. Leads and notes still have table grants, but read scope via owner predicates. Lead followups owner scope via lead->business relationship; insert done_at null; update WITH CHECK owner. Marketing tables scoped by user/business, column-only grants can look like false at table privilege level; verified campaign allowed INSERT columns = banner_color/banner_text/brief/business_id/platforms/poster_asset_id/scheduled_at/status; UPDATE = banner_color/banner_text/brief/is_archived/platforms/scheduled_at/status. Draft UPDATE only caption/review_status. Brand INSERT/UPDATE allowlist owner/business RLS; secret vault and private jobs/intents deny anon/auth table reads/writes.
- RPCs growth_consume_credits, marketing_reserve_ai_draft, complete, refund, poster reserve/claim/complete/refund, voice_try_reserve, slbi_record_growth_event, slbi_submit_verified_lead all deny anon/auth execute and allow service_role. growth_wallet_status authenticated execute, anon denied; inspect exact body and run scoped synthetic identity tests later. SEC DEF functions present; review search_path and grants before introducing new RPCs.
- Advisors observed 15 RLS-enabled/no-policy informational items (many deliberately server-only), 18 mutable search_path warnings, public spatial_ref_sys RLS ERROR, PostGIS and pg_trgm in public warnings, 6 anon-executable security-definer function warnings incl. increment_business_views, global search suggestions and nearby. Investigate actual scope; no blanket extension move or revocation that could break Discovery. Function increment_business_views must not become GrowthScore evidence without validation. Advisor refs: [RLS no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [function search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [public RLS](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public), [extensions](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [anon definer](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- No synthetic A/B/anon/expired-Pro integration tests executed in this audit. G0-03 remains open.

## 6. Growth analytics & CRM provenance, partial G0-02
Live aggregate snapshot at query: 525 analytics rows (previous checkpoint 524; live counts change). Metadata->>'ingestion' growth-v1: 44 view events; no ingestion marker: 411 views, 23 call_click, 34 location_click, 13 lead_form_submit = 481 legacy/unclassified rows. Do not upgrade unmarked rows into verified events; marker alone is not human/consent evidence. Current server route requires same-origin JSON, opt-out check, validation, trusted proxy, hashed rate bucket, re-check DB RPC. No raw IP written by that route. G0-02: inspect live RPC body, event IDs, rate-bucket retention, privacy disclosure and client call sites; confirm actual source, time period and dedup, no raw PII usage. Map legacy read-only policy and do not retroactively fabricate provenance.
15 CRM leads: 13 source “Business Detail Page”, 2 “Mobile App - Business Details”. Distinguish independent analytics submit events from CRM records. No leads verified merely because source label exists. Secure endpoint includes same-origin, 6KB payload validation, Turnstile server verification with action/hostname, service RPC with idempotency and HMAC buckets. However live legacy policy (“SLBI legacy compatible enquiry insert”) still permits anon/auth INSERT for approved businesses, status new, length-bounded fields and at least phone/email. It does NOT require Turnstile and may accept caller-controlled source; compatibility path intentionally retained pending migration review. Need source-by-source client audit, mobile version compatibility, tested transition to secure endpoint and rollback before changing grants. Do not disable active enquiry forms.
Reputation: aggregate query found **2 of 23 approved businesses** with at least one approved review and stale cached rating and/or reviews_count. Existing before-update moderation audit and after-insert/update notification triggers found; no cache synchronization trigger in observed review trigger list. Must reproduce synthetic approved/pending/rejected transitions and reconcile cache under reviewed G0/G5 fix (no live writes yet). Do not use cached values in GrowthScore before correction or canonical computation.

## 7. Runtime flags and billing boundaries
- Production project metadata contains plain flag names GROWTH_EVENT_INGESTION_ENABLED, SLBI_SECURE_LEADS_ENABLED, SLBI_MARKETING_AI_ENABLED. Only names/targets read from non-decrypted listing; values and exact runtime behavior not certified. BILLING_HYBRID_ENABLED not found in that filtered production listing; absence in this check is not complete environment audit. Confirm with safe nonmutating capability checks/authorized config read (never read/display secrets). Source routes explicitly fail closed for absent flags. No flag toggles performed.
- Supabase DB action rows: ai_social_draft enabled (2 credits), ai_poster_design enabled (8), ai_email_draft disabled (3), seo_basic_audit disabled (10). DB action flag alone does not grant route, provider or rollout authority. Do not change costs. Rollout 1/12: Campaign Planner live, other 11 coming_soon. Aggregate entitlement rows 1, currently valid 1, owner-approved QA marker active 1. Staff review fallback expired 2026-11-22 00:00 Colombo, separate QA entitlement still valid. Current Pro access evaluates DB plan, payment reference, verified_at, expires_at under verified auth. Do not extend time or grant new entitlement. Provider acceptance and billing reconciliation remain open per P2-37.
- Neon project SLBI-GrowthOS-Billing (PG17), main default and staging/test branches exist. Main connection's database inventory lists postgres and slbi_growth. Read-only table/routine inventory returned no user-visible rows for default and explicit slbi_growth; cannot establish actual billing schema, grants, canonical connection or settlement functionality from these results. Do NOT conclude data missing or create billing tables. Confirm correct branch/database/role and historical billing migrations, use approved evidence, never expose connection strings. Existing app has hybrid API gated by BILLING_HYBRID_ENABLED and distinct customer/settlement pools. G0-04 must reconcile Supabase wallet versus Neon source-of-truth and payment ledger before financial automation.
- Existing extensions pg_cron 1.6.4, pg_net 0.19.5, pg_trgm 1.6, postgis 3.3.7, vector 0.8.0; pgmq not installed among queried extension set. No queue install now. G6 choice deferred.

## 8. Blocker register and next actions
| ID | Severity | Evidence | Remediation gate |
|---|---|---|---|
| G0-B01 | Release blocker | Exact full CI stopped at 2 mobile contract assertions | Correct test contracts in reviewed branch; run full CI, verify real mobile/signed-out/in behavior |
| G0-B02 | Release blocker | Migration version sets differ substantially | Reconcile actual SQL and live objects; reviewed migration plan, do not replay |
| G0-B03 | High | Legacy direct lead insertion and mixed event provenance | G0-02: map client channels, safe cutover plan, event/lead evidence taxonomy |
| G0-B04 | High | 2 approved listing review cache mismatches | Canonical approved review aggregation + tested remediation, staged not live |
| G0-B05 | High | Hybrid billing schema/config not established; runtime flags not fully verified | G0-04 read-only billing/flag evidence and controlled integration testing |
| G0-B06 | High | Broad grants, security advisors and untested owner/expiry negatives | G0-03 role/trigger tests in disposable environment; prioritize actual privilege risk |
| G0-B07 | High | P2-37 signed-in, cost, mic, provider, distinct upload and asset-reference gates outstanding | G0-05 record acceptance plan; preserve internal QA, no further rollout |

Checklist: **0/10 master, 0/41 engineering** accepted. G0-01 initial inventory has concrete evidence but is NOT closed; evidence collection overlaps G0-02/03/04, no phase may be skipped. G0-01 next: reconcile full CI + migration mapping, establish actual configuration/ownership inventory and capture reviewed evidence. No new UI or schema until G0 reviewed. This audit has not run full CI independently, authenticated browser tests, negative SQL tests or AI calls. No external skills installed; UI/UX workstream remains as accepted.

## 9. Mandatory next-chat prompt (update at every verified milestone)
```text
Continue SLBusinessIndex Growth Intelligence Core V1 on GitHub main (Victor-dev-03-cmd/sl_business_index). Read AGENTS.md, docs/growth/SLBI_MASTER_IMPLEMENTATION_HANDOFF.md, docs/growth/GROWTH_ENGINE_EXECUTION_HANDOFF_V1_20261122.md, docs/growth/GROWTH_ENGINE_RELEASE_CHECKLIST.md, and docs/growth/G0_01_FOUNDATION_EVIDENCE_AUDIT_20261122.md. Reverify HEAD and exact production/CI. G0-01 inventory is in progress, not accepted; 0/10 master and 0/41 engineering gates checked. Next: review G0-01 release blockers, reconcile the 2 stale mobile contract assertions against intended NotificationBell and desktop-only LiveCounter behavior, map SQL migration ID/name/content parity without replaying migrations, and establish the real Neon billing schema/connection and runtime flag evidence. Keep Discovery and all UI unchanged; make any test remediation in a reviewed development branch, no unapproved production schema writes, paid AI, external sends, or provider rollout. Continue G0-02 event/lead provenance, G0-03 synthetic tenant/entitlement tests and review-cache integrity after the first blockers are documented/resolved. Update the living checklist and master handoff with exact test, CI, migration and deployment evidence; leave unverified gates unchecked. In every milestone report include the ready-to-copy next-chat prompt. Respond in Tamil.
```
