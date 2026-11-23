# G0-01 — Repository migration inventory and provenance review (evidence-only)

Date: 2026-11-23 (Asia/Colombo). Source: GitHub main `7d3fd05ea94a0ae1653077fa531299ac2c595803`; prior manifest `docs/growth/g0/MIGRATION_PROVENANCE_20261122.json` at snapshot `51b93d24dfd65cf1cff0ca143f4dc21e5f730e71`. **G0-01 remains OPEN; no production schema/history writes, no migration replay, no live equivalence signoff.**

## Reproduced inventory classification
- `47` recorded live migration statements: `34` matched exact SQL content (or solely terminal LF), `13` historical catalog-evidence cases, not proven full DDL/seed/policy parity.
- `115` SQL migration-directory files, `27` with recorded live content matches, `88` unmatched by content. These are **source-inventory classifications**, not evidence of unapplied migrations.
- Recomputed unmatched distribution: `202603`: 72; `202604`: 3; `202605`: 7; `202606`: 1; `202610`: 1; `202611`: 4.
- A file name only signals intended subject; **no per-file executable SQL equivalence established** in this checkpoint. Unknown March baseline provenance must not be treated as pending deployment.

## Priority disposition queues (review-only)
| Queue | Matching rule | Next evidence needed | Status |
|---|---|---|---|
| P0 — Privilege, tenant and money | Unmatched filename suggests auth, policy, permission, RLS, storage, extension, security, trigger, wallet, credit, subscription, billing or verification | Inspect SQL bodies and object-level present definitions, owner grants/RLS, dependencies and later superseding patches; isolate and test | REVIEW_REQUIRED |
| P1 — Runtime/search & data layout | Other unmatched scripts affecting nearby RPC, indexes, categories, address, news, analytics, tables and UI feeds | Compare current pg_catalog objects, constraints, triggers, indexes and REST contracts to intended final state | REVIEW_REQUIRED |
| Historical supersession | Any multi-version files affecting same object or same Git blob with different names | Establish precise change ordering and effective current object fingerprint; never infer from timestamp/name alone | REVIEW_REQUIRED |

## All 88 unmatched repository SQL paths
| Source month | Filename | Initial review queue (filename heuristic only) |
|---|---|---|
| 202603 | `20260302085824_initial_system_setup.sql` | P1 — object parity |
| 202603 | `20260302132537_add_website_fields_to_businesses.sql` | P1 — object parity |
| 202603 | `20260302133423_clean_up_website_fields.sql` | P1 — object parity |
| 202603 | `20260302134437_fix_schema_permissions.sql` | P0 — sensitive contract |
| 202603 | `20260302135111_add_email_to_profiles_and_backfill.sql` | P1 — object parity |
| 202603 | `20260303091637_add_notifications_table.sql` | P1 — object parity |
| 202603 | `20260303095623_fix_nearby_search_and_permissions.sql` | P0 — sensitive contract |
| 202603 | `20260303102713_migrate_to_postgis_geography.sql` | P0 — sensitive contract |
| 202603 | `20260303103238_align_nearby_rpc_parameters.sql` | P1 — object parity |
| 202603 | `20260303103956_upgrade_search_to_trigram.sql` | P1 — object parity |
| 202603 | `20260303105239_advanced_full_text_search_system.sql` | P1 — object parity |
| 202603 | `20260303110721_optimize_broad_search_logic.sql` | P1 — object parity |
| 202603 | `20260303123950_fix_nearby_rpc_return_type.sql` | P1 — object parity |
| 202603 | `20260305171500_add_categories_table.sql` | P1 — object parity |
| 202603 | `20260305181500_force_refresh_categories.sql` | P1 — object parity |
| 202603 | `20260308110000_vendor_dashboard_tables.sql` | P1 — object parity |
| 202603 | `20260308120000_admin_enhancements.sql` | P1 — object parity |
| 202603 | `20260308130000_add_facilities_to_businesses.sql` | P1 — object parity |
| 202603 | `20260308140000_add_view_increment_rpc.sql` | P1 — object parity |
| 202603 | `20260308150000_update_nearby_rpc_with_verified.sql` | P1 — object parity |
| 202603 | `20260308160000_vendor_admin_enhancements.sql` | P1 — object parity |
| 202603 | `20260309010000_add_verification_to_profiles.sql` | P0 — sensitive contract |
| 202603 | `20260309020000_update_nearby_rpc_with_verification_status.sql` | P0 — sensitive contract |
| 202603 | `20260309030000_fix_verifications_table.sql` | P0 — sensitive contract |
| 202603 | `20260309040000_ensure_verification_bucket.sql` | P0 — sensitive contract |
| 202603 | `20260309050000_disable_rls_on_buckets.sql` | P0 — sensitive contract |
| 202603 | `20260309060000_fix_profiles_policy.sql` | P0 — sensitive contract |
| 202603 | `20260309070000_add_featured_to_businesses.sql` | P1 — object parity |
| 202603 | `20260310080000_create_featured_listings_table.sql` | P1 — object parity |
| 202603 | `20260310090000_admin_notifications_triggers.sql` | P0 — sensitive contract |
| 202603 | `20260310100000_subscription_plans_and_announcements.sql` | P0 — sensitive contract |
| 202603 | `20260311100000_advanced_plans_and_notifications.sql` | P1 — object parity |
| 202603 | `20260311110000_update_nearby_rpc_with_plan_features.sql` | P1 — object parity |
| 202603 | `20260311120000_cache_business_features.sql` | P1 — object parity |
| 202603 | `20260311130000_default_basic_subscription.sql` | P0 — sensitive contract |
| 202603 | `20260311150000_sync_featured_table.sql` | P1 — object parity |
| 202603 | `20260311160000_comprehensive_billing_fix.sql` | P0 — sensitive contract |
| 202603 | `20260311170000_fix_user_trigger_role.sql` | P0 — sensitive contract |
| 202603 | `20260312113000_create_analytics_logs.sql` | P1 — object parity |
| 202603 | `20260312120000_site_settings.sql` | P1 — object parity |
| 202603 | `20260313060000_appearance_settings.sql` | P1 — object parity |
| 202603 | `20260313100000_theme_colors.sql` | P1 — object parity |
| 202603 | `20260313110000_reviews_sentiment.sql` | P1 — object parity |
| 202603 | `20260313120000_extra_site_settings.sql` | P1 — object parity |
| 202603 | `20260315123000_add_avatar_url_to_profiles.sql` | P1 — object parity |
| 202603 | `20260316000000_create_promotions_table.sql` | P1 — object parity |
| 202603 | `20260316100000_fix_logo_upload_permissions.sql` | P0 — sensitive contract |
| 202603 | `20260323010000_qr_inventory_system.sql` | P1 — object parity |
| 202603 | `20260323020000_add_advanced_feature_access_to_plans.sql` | P1 — object parity |
| 202603 | `20260323030000_add_dynamic_features_to_plans.sql` | P1 — object parity |
| 202603 | `20260323040000_fix_storage_and_settings_rls.sql` | P0 — sensitive contract |
| 202603 | `20260323050000_add_detailed_address_to_businesses.sql` | P1 — object parity |
| 202603 | `20260323060000_fix_user_sign_up_permanently.sql` | P1 — object parity |
| 202603 | `20260323070000_consolidated_user_triggers.sql` | P0 — sensitive contract |
| 202603 | `20260323080000_robust_auth_trigger_sync.sql` | P0 — sensitive contract |
| 202603 | `20260323090000_add_category_images_bucket.sql` | P0 — sensitive contract |
| 202603 | `20260323100000_fix_qr_inventory_policies.sql` | P0 — sensitive contract |
| 202603 | `20260323110000_recreate_qr_policies.sql` | P0 — sensitive contract |
| 202603 | `20260329103000_add_slug_to_businesses.sql` | P1 — object parity |
| 202603 | `20260329113000_update_nearby_rpc_category_filter.sql` | P1 — object parity |
| 202603 | `20260329120000_fix_nearby_rpc_category_filter_case.sql` | P1 — object parity |
| 202603 | `20260329121000_fix_nearby_rpc_robust_category.sql` | P1 — object parity |
| 202603 | `20260329123000_optimize_nearby_rpc.sql` | P1 — object parity |
| 202603 | `20260329130000_businesses_rls_policies.sql` | P0 — sensitive contract |
| 202603 | `20260329140000_unify_nearby_rpc.sql` | P1 — object parity |
| 202603 | `20260329141000_fix_nearby_rpc_columns.sql` | P1 — object parity |
| 202603 | `20260330014200_update_nearby_rpc_with_detailed_address.sql` | P1 — object parity |
| 202603 | `20260330020000_add_city_and_update_nearby_search.sql` | P1 — object parity |
| 202603 | `20260330030000_add_global_search_suggestions_rpc.sql` | P1 — object parity |
| 202603 | `20260330040000_create_contact_submissions.sql` | P1 — object parity |
| 202603 | `20260331000000_create_testimonials_table.sql` | P1 — object parity |
| 202603 | `20260331100000_testimonials_storage.sql` | P0 — sensitive contract |
| 202604 | `20260430110000_add_business_news_table.sql` | P1 — object parity |
| 202604 | `20260430120000_update_business_news_fields.sql` | P1 — object parity |
| 202604 | `20260430130000_add_news_images_and_storage.sql` | P0 — sensitive contract |
| 202605 | `20260501100000_add_verification_status_to_businesses.sql` | P0 — sensitive contract |
| 202605 | `20260502100010_add_user_safety_and_moderation_v2.sql` | P1 — object parity |
| 202605 | `20260502110000_add_verification_details.sql` | P0 — sensitive contract |
| 202605 | `20260502120000_add_business_audit_trail.sql` | P1 — object parity |
| 202605 | `20260502120010_update_statuses.sql` | P1 — object parity |
| 202605 | `20260528000000_add_main_category_groups.sql` | P1 — object parity |
| 202605 | `20260529000000_fix_signup_trigger.sql` | P0 — sensitive contract |
| 202606 | `20260605000000_pg_trgm_fuzzy_search.sql` | P0 — sensitive contract |
| 202610 | `20261009000000_push_subscriptions.sql` | P0 — sensitive contract |
| 202611 | `20261110010000_growth_os_credit_foundation.sql` | P0 — sensitive contract |
| 202611 | `20261114215434_p2_poster_private_credit_jobs_default_disabled_20261115.sql` | P0 — sensitive contract |
| 202611 | `20261114215442_p2_poster_private_storage_default_locked_20261115.sql` | P0 — sensitive contract |
| 202611 | `20261118004500_p2_31_restore_campaign_column_grants.sql` | P0 — sensitive contract |

## Historical live catalog-evidence cases (13)
| Live version | Migration | Existing catalog evidence; residual work |
|---|---|---|
| `20261111071341` | `semantic_v3_research_foundation` | /O/b/j/e/c/t/s/ /c/o/n/f/i/r/m/e/d/:/ /p/r/i/v/a/t/e/ /e/m/b/e/d/d/i/n/g/s/,/ /a/d/m/i/n/ /e/v/a/l/u/a/t/i/o/n///r/e/l/e/v/a/n/c/e/ /t/a/b/l/e/s/;/ /R/L/S/ /e/n/a/b/l/e/d/./ /L/a/t/e/r/ /s/e/m/a/n/t/i/c/ /v/e/r/s/i/o/n/s/ /s/u/p/e/r/s/e/d/e/ /p/a/r/t/s/;/ /s/e/e/d/-/r/o/w/ /a/n/d/ /c/o/m/p/l/e/t/e/ /D/D/L/ /e/q/u/i/v/a/l/e/n/c/e/ /n/o/t/ /c/l/a/i/m/e/d/./ |
| `20261111071708` | `semantic_v3_native_review` | /E/v/a/l/u/a/t/i/o/n/ /v/a/l/i/d/a/t/i/o/n/_/s/t/a/t/u/s/,/ /v/a/l/i/d/a/t/e/d/_/b/y/ /a/n/d/ /v/a/l/i/d/a/t/e/d/_/a/t/ /c/o/l/u/m/n/s/ /o/b/s/e/r/v/e/d/;/ /c/o/m/p/a/r/e/ /f/u/l/l/ /c/u/r/r/e/n/t/ /a/d/m/i/n/ /p/o/l/i/c/y/ /b/e/f/o/r/e/ /G/0/ /c/l/o/s/u/r/e/./ |
| `20261111072328` | `semantic_v3_multimodel_dimensions` | /V/e/c/t/o/r/ /a/n/d/ /e/m/b/e/d/d/i/n/g/_/d/i/m/e/n/s/i/o/n/s/ /c/o/l/u/m/n/s/ /o/b/s/e/r/v/e/d/ /o/n/ /p/r/i/v/a/t/e/ /t/a/b/l/e/;/ /a/c/t/u/a/l/ /d/i/m/e/n/s/i/o/n/ /c/o/n/s/t/r/a/i/n/t/s/ /s/t/i/l/l/ /n/e/e/d/ /c/o/m/p/a/r/i/s/o/n/./ |
| `20261111121118` | `vendor_notification_preferences_owner_scoped_v1` | /P/r/e/f/e/r/e/n/c/e/s/ /t/a/b/l/e/ /o/b/s/e/r/v/e/d/,/ /R/L/S/ /e/n/a/b/l/e/d/,/ /a/u/t/h/ /s/e/l/e/c/t/ /g/r/a/n/t/e/d/;/ /o/w/n/e/r/-/p/o/l/i/c/y/ /e/x/a/c/t/ /b/o/d/y/ /s/t/i/l/l/ /t/o/ /c/o/m/p/a/r/e/./ |
| `20261111121230` | `private_verification_documents_owner_path_v1` | /v/e/r/i/f/i/c/a/t/i/o/n/-/d/o/c/s/ /b/u/c/k/e/t/ /p/r/i/v/a/t/e/,/ /1/0/ /M/i/B/,/ /o/w/n/e/r/-/u/p/l/o/a/d/ /p/o/l/i/c/y/ /o/b/s/e/r/v/e/d/;/ /u/p/d/a/t/e/d/ /b/y/ /n/e/x/t/ /h/i/s/t/o/r/i/c/a/l/ /m/i/g/r/a/t/i/o/n/./ |
| `20261111130737` | `fix_verification_upload_business_owner_path_v2` | /C/u/r/r/e/n/t/ /p/o/l/i/c/y/ /v/e/r/i/f/i/e/d/:/ /s/t/o/r/a/g/e/./o/b/j/e/c/t/s/./n/a/m/e/ /q/u/a/l/i/f/i/e/d/,/ /p/a/t/h/ /o/w/n/e/r///b/u/s/i/n/e/s/s/ /c/h/e/c/k/./ |
| `20261112194811` | `p0_business_logos_owner_isolation` | /C/u/r/r/e/n/t/ /l/o/g/o/ /m/u/t/a/t/i/o/n/s/ /h/a/v/e/ /o/w/n/e/r/-/f/o/l/d/e/r/ /c/h/e/c/k/s///a/d/m/i/n/ /p/o/l/i/c/y/,/ /p/u/b/l/i/c/ /i/m/a/g/e/ /r/e/a/d/;/ /c/h/e/c/k/ /m/a/l/f/o/r/m/e/d/ /p/a/t/h/ /h/a/n/d/l/i/n/g/ /a/n/d/ /c/l/i/e/n/t/ /u/p/l/o/a/d/ /a/c/c/e/p/t/a/n/c/e/./ |
| `20261114134136` | `p2_campaign_planner_basic_marketplace_live_v1` | /C/a/m/p/a/i/g/n/ /P/l/a/n/n/e/r/ /r/o/l/l/o/u/t/ /l/i/v/e/;/ /c/o/n/f/i/r/m/ /r/e/l/a/t/e/d/ /r/o/l/e/ /a/n/d/ /r/e/l/e/a/s/e/ /t/e/s/t/s/./ |
| `20261116195104` | `p2_internal_qa_voice_brief_quota_override_20261116` | /V/o/i/c/e/ /q/u/o/t/a/ /m/a/x/_/a/t/t/e/m/p/t/s/ /e/x/i/s/t/s/,/ /R/P/C/ /s/e/r/v/i/c/e/-/o/n/l/y/,/ /R/L/S/;/ /l/a/t/e/r/ /s/h/a/r/e/d/ /Q/A/ /q/u/o/t/a/ /m/i/g/r/a/t/i/o/n/ /m/a/t/c/h/e/d/./ /N/o/ /c/o/p/y/i/n/g/ /o/w/n/e/r/-/s/p/e/c/i/f/i/c/ /h/i/s/t/o/r/y/./ |
| `20261117185922` | `p2_30_campaign_planner_authenticated_owner_grants_20261118` | /B/r/o/a/d/ /c/a/m/p/a/i/g/n/ /t/a/b/l/e/ /w/r/i/t/e/ /g/r/a/n/t/ /s/u/p/e/r/s/e/d/e/d/ /b/y/ /P/2/-/3/1/ /r/e/v/o/k/e/ /a/n/d/ /P/2/-/3/2/ /c/o/l/u/m/n/ /a/l/l/o/w/l/i/s/t/;/ /d/o/ /n/o/t/ /r/e/p/l/a/y/./ |
| `20261117190516` | `p2_31_restore_campaign_column_grants_20261118` | /H/i/s/t/o/r/i/c/a/l/ /r/e/v/o/k/e/-/o/n/l/y/ /S/Q/L/ /d/i/f/f/e/r/s/ /f/r/o/m/ /r/e/p/o/s/i/t/o/r/y/ /r/e/m/e/d/i/a/t/i/o/n/;/ /P/2/-/3/2/ /e/x/a/c/t/ /m/a/t/c/h/ /a/n/d/ /o/b/s/e/r/v/e/d/ /r/e/s/t/o/r/e/d/ /a/l/l/o/w/l/i/s/t/./ /D/o/ /n/o/t/ /r/e/p/l/a/y/ /s/t/a/n/d/a/l/o/n/e/ /r/e/v/o/k/e/./ |
| `20261120103549` | `fcm_dispatch_enable_scheduler_extensions` | /p/g/_/n/e/t/ /a/n/d/ /p/g/_/c/r/o/n/ /i/n/s/t/a/l/l/e/d/;/ /n/o/ /r/e/p/l/a/y/./ |
| `20261120103628` | `fcm_dispatch_direct_http_transport` | /h/t/t/p/ /e/x/t/e/n/s/i/o/n/ /i/n/s/t/a/l/l/e/d/;/ /n/o/ /r/e/p/l/a/y/./ |

## Necessary next verification sequence
1. Obtain **read-only**, redacted, current pg_catalog snapshot of each affected schema's functions (identity arguments, definition fingerprint, security definer, search_path, ACL), table constraints/indexes/triggers/RLS, policies and storage bucket ownership. Identify extension-owned objects separately. No raw secrets/PII; no service token in logs.
2. For 72 March SQL files, identify initial baseline/import provenance and **superseding** final objects before deciding whether any historical steps are represented. Explicitly flag `disable_rls_on_buckets`, permission/grant changes and PostGIS/trigram changes as dangerous to replay.
3. Compare 13 live historical cases against present objects, listing precise unresolved fields (e.g. vector dimension constraints, policy bodies, private storage scope, campaign grants). A superseding migration can explain drift but does not prove historical statement execution.
4. Mark each file `baseline-proven`, `superseded-proven`, `not-deployed-intentional`, or `requires-owner-decision` **only when corroborating SQL/body/catalog evidence exists**. Until then `UNRESOLVED_DO_NOT_REPLAY`.
5. Freeze current runtime/flags and get owner G0-01 acceptance only after audit evidence complete. Any future fix must use an independently numbered reviewed migration and separately approved release window/backup/rollback.

## Adjacent gates / constraints
- G0 Foundation accepted **0/7**, whole GrowthOS master accepted **0/10** (different registers), no G1 implementation.
- Production read-only preflight 6/6 pass (at prior frozen snapshot) does **not** repair 2 stale review caches; scoped 14/14 RLS and zero unsafe reads in sampled private tables do **not** disposition 3 anonymous-callable definer functions or 14 mutable search paths.
- Mobile GPS reportedly works; desktop GPS reportedly unreliable. D03/physical QA not accepted.
- Fresh independent-password GPG backup, isolated restore and independently verified physical-drive copy pending. Lead/Review and wallet approvals independent. No paid provider, needless preview or customer data writes.

## Next-chat prompt
```text
Continue SLBusinessIndex GrowthOS in Tamil. Repo Victor-dev-03-cmd/sl_business_index. Read AGENTS.md, docs/growth/G0_11_FOUNDATION_EXIT_SECURITY_AUDIT_20261123.md, docs/growth/g0/exit/G0_FOUNDATION_EXIT_LEDGER_20261123.json, docs/growth/G0_12_MIGRATION_PROVENANCE_INVENTORY_20261123.md, docs/growth/g0/MIGRATION_PROVENANCE_20261122.json, docs/growth/GROWTH_ENGINE_RELEASE_CHECKLIST.md. G0-01 review reproduced 47 live (34 exact match, 13 historical catalog cases) and 115 repository SQL (27 matched, 88 unmatched: March 72, April 3, May 7, June 1, October 1, November 4). Filename risk buckets are heuristics, NOT proven live migration status; do not replay SQL or alter production history. Next read sensitive unmatched SQL and verify current pg_catalog fingerprints and historical baseline/supersession (read-only), review 13 cases with exact constraints and policies. Keep G0 0/7 and master 0/10; two review caches unresolved; definer function risk triage open; mobile GPS reported working, desktop GPS unresolved. Independently encrypted GPG backup, isolated restore and physical copy pending; separate Lead/Review and wallet owner approvals. No production DDL, customer writes, paid resources, needless Vercel previews, or G1 engineering until G0 signoff. Update GitHub handoff/checklist and next prompt at next verified milestone.
```
