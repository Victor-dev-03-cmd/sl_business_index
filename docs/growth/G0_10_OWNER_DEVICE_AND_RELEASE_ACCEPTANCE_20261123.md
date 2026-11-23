# G0-10 — actual device and scoped release acceptance

**State:** OPERATOR ACCEPTANCE PENDING — not a production migration approval. Updated 2026-11-23.

## Completed G0-09 browser-engine milestone
PR [#154](https://github.com/Victor-dev-03-cmd/sl_business_index/pull/154) merged `30b75cfd7675c97bdc6e2ea53600eb24f00d1ae6`. Final candidate `e4e11885cbf14aee1b38360a4d7a613b8f55a7ac`. Six PR workflows PASS:

| Workflow | Run ID | Result |
|---|---|---|
| G0-09 Chromium/WebKit browser acceptance | 45109255521 | PASS — 9/9 browser tests |
| Verify Next.js Build | 45109255442 | PASS |
| P1 Integrated Release Gate | 45109255411 | PASS |
| G0 Foundation integrity | 45109255385 | PASS |
| Independent PostgreSQL billing | 45109255502 | PASS |
| Billing V2 SQL | 45109255517 | PASS |

New tests execute against **local Next.js production-mode build only** with synthetic dummy Supabase configuration; external provider calls blocked and no production database access. Three browser configurations: Android Pixel 7 Chromium, iPhone 13 WebKit, desktop Chromium. Three checks each: anonymous vendor/admin/registration redirect to safe sign-in; sign-in options/email/password controls and mobile overflow; signup and sign-in navigation. Browser emulation is NOT a physical Android/iOS device nor complete authenticated E2E.

## Actual owner device QA matrix — no claimed passes

Keep screenshots private and redact email addresses, tokens, QR codes, customer content and admin records. Never paste passwords, cookies, JWTs, GPG passphrases or live records into chat/GitHub. The owner may test existing account sign-in and read-only navigation; do not insert customer rows, send enquiries, publish posts, approve real reviews or spend AI credits without separate written QA approval and cleanup scope.

| ID | Target | Test and expected result | Current |
|---|---|---|---|
| D01 | Android Chrome actual phone | HTTPS canonical URL, login/signup UI, keyboard opening, no overflow/horizontal scroll; password toggle and return navigation | NOT_RUN |
| D02 | iOS Safari actual phone | Same as D01, viewport safe area and URL bar changes do not hide actions | NOT_RUN |
| D03 | Ubuntu/Desktop Chrome | Normal login desktop layout, role-appropriate navigation and logout | NOT_RUN |
| D04 | Android & iOS signed-in owner | Real Google or Email sign-in; session survives refresh, navigation and browser restart under expected policy; no loop | NOT_RUN |
| D05 | Vendor A/B real authorized QA accounts | Each can read only own leads, notes, reviews and follow-ups; cross-tenant pages/API never disclose rows | NOT_RUN |
| D06 | Admin real authorized QA account | Admin-only queue and settings reachable, vendor/customer denied; read-only check first | NOT_RUN |
| D07 | Email + Cloudflare Turnstile | Prompt appears, valid site-key/hostname verification and session cookie roundtrip; refusal/failure handled without bypass | NOT_RUN |
| D08 | Google OAuth and Passkey (if configured) | Canonical-origin PKCE, cookie persistence, passkey rejection/fallback and reauth handling; no secret leak | NOT_RUN |
| D09 | Responsive mobile vendor dashboard | Top navigation, dropdowns, profile/logout, forms and keyboard on both real browsers without overlap | NOT_RUN |
| D10 | Controlled write and concurrency QA | Synthetic lead replay, owner moderation, review cache, Turnstile expiry and revoke behavior end-to-end; requires separate scope and write approval, otherwise NOT_RUN | NOT_RUN |

For each case retain locally: `case_id`, `browser + OS version`, `UTC run time`, `deployed application SHA`, `PASS|FAIL|BLOCKED`, error category without personal identifiers, and authorized QA reviewer. A failed or blocked case cannot be counted as PASS. Real QA keys/credentials must not enter source or CI.

## Mandatory operational release gates — open
1. **Fresh owner archive:** at release time, create encrypted backup using a new independent strong GPG passphrase, NOT Ubuntu login password; verify hash and actual isolated restoration from this fresh archive. Prior backup restore remains historical evidence, not this fresh gate.
2. **Independent copy:** use `scripts/g0/verify-independent-backup-copy.sh --copy <source> <external-mount-root>`, enforce separate physical drive and owner-only permissions, check `COPY_VERIFIED_SEPARATE_PHYSICAL_DRIVE`. Operator proof remains NOT_RUN; `--verify` proves copied bytes only. Never upload archive/password.
3. **Current preflight:** execute `docs/growth/g0/release/PRE_RELEASE_READ_ONLY.sql` immediately before release and check all six PASS against frozen RPC hashes, 14 RLS tables, 47 migration history, 2 expected review cache mismatches, zero wallet mismatch, legacy lead policy. Any drift requires re-review, not automatic SQL patching.
4. **Exactly scoped approval:** explicitly authorize Lead and Review migration bodies separately, exact release window/maintenance and rollback/aftercare. Do not `supabase db push` historical unclassified migrations. Review lock_timeout=5s and measured traffic window; recovery requires approved new migration, not destructive database reset.
5. **Wallet and paid-provider policy:** owner separately decides downgrade/refund/credit allowance before financial migration; no production change under Lead/Review approval.
6. **Full platform recovery limitations:** logical PostgreSQL archive alone does not restore Supabase Storage objects, Vault root key, auth provider config or cluster global roles. Never describe this rehearsal as full Supabase disaster recovery.

## Execution order when operator is available
Complete D01–D09 read-only real-device QA, fresh backup/independent media copy and isolate restore evidence, fresh live preflight, then obtain explicit scoped production approvals. D10 needs separate QA write permission. Until complete, Lead/Review production migrations remain BLOCKED. No new paid Supabase branch or manual Vercel Preview.

## Next chat prompt (copyable)

```text
Continue SLBusinessIndex GrowthOS G0 in Tamil. Repo Victor-dev-03-cmd/sl_business_index. Start with AGENTS.md, docs/growth/G0_10_OWNER_DEVICE_AND_RELEASE_ACCEPTANCE_20261123.md, G0_09_BROWSER_DEVICE_ACCEPTANCE_20261123.md, G0_08_RELEASE_SAFETY_AND_BACKUP_COPY_20261123.md and GROWTH_ENGINE_RELEASE_CHECKLIST.md. PR #154 e4e11885 candidate merged 30b75cfd after all 6 CI PASS: G0 browser 45109255521 9/9 Android Chromium/iPhone WebKit/desktop Chromium tests against local mock-only Next, Next build 45109255442, P1 integration 45109255411, G0 integrity 45109255385, billing 45109255502 and 45109255517. Previous PR #152 real synthetic Auth/PostgREST passed 6/6 CI, #153 encrypted independent drive copy helper and live 6/6 read-only preflight passed. Owner production AES256 encrypted DB archive SHA256 8b114ef50bac1d4d76dc0efb604a1e625eb93237150da9f27ab511d476553b99 was actually restored into offline Docker and tested lead/review migration forward/recovery/reapply; PC shutdown invalidated temporary restored PGDATA, encrypted disk archive persists. Next: G0-10 actual Android Chrome/iOS Safari/desktop authenticated owner A/B/admin QA (all D01-D10 NOT_RUN), plus fresh independent GPG passphrase encrypted backup + isolated restore + verified external physical drive copy. No credentials, archives or PII in chat. Then fresh read-only production preflight and explicit separate Lead/Review migration body/window approval; wallet financial allowance/refund separate; no production DDL, no paid provider or preview, G1 blocked and 0/10 master release gates accepted. Each milestone update handoff and give next chat prompt.
```
