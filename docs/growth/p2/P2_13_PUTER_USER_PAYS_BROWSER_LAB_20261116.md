# SLBI P2-13 — Isolated Puter.js Browser Image Lab (2026-11-16)

## Owner's instruction / account status
- Owner has signed into Puter.com and sees a dashboard API-token generation option.
- **No API key or token is required for browser Puter.js.** Puter authenticates through the individual user's interactive sign-in popup. Never ask for, paste or store a personal token, and never configure it in SLBI's NEXT_PUBLIC variables. Token use is intended for CLI/backend and is unrelated to this browser experiment.
- Vendor-funded **User-Pays** AI usage means test real requests can consume the **Puter user's own** trial allowance or funds. It is not unlimited free inference. Distinguish the user's Puter charges from the SLBI existing 8 Growth Credit action.

## Scoped implementation (NOT a production provider switch)
- Preview-only branch: `feat/p2-puter-browser-experiment-20261116`. Do NOT merge to production without owner QA.
- Route `/vendor/marketing/design/puter-lab` nested under existing `app/vendor/marketing/design/layout.tsx` server-side Pro/staff reviewer authorization.
- Frontend `https://js.puter.com/v2/` (official SDK) loaded in browser, no server credentials, no Supabase write, no change to Cloudflare `SLBI_POSTER_IMAGE_PROVIDER`.
- Models for comparison from official Puter catalog: GPT Image 2, Gemini 3 Pro Image Preview, FLUX.2 Pro, Qwen Image **2.0**. **Qwen Image 2.1 availability through Puter has NOT been verified.** Do not mislabel v2.0 as 2.1.
- Safe default `test_mode:true`: outputs a sample asset **not actual model result**, no AI credit consumed. Real inference requires user flipping switch and separately confirming Puter User-Pays charges on the page. No calls occur on initial page load.
- Explicit signIn from button click, then txt2img once per click; preview in memory. The output may be a transient hosted URL, so no claims about long-lived export or SLBI private storage. No SLBI poster ledger, global image quota, Gemini prompt/voice, no auto publishing or auto posting.
- Model output may contain gibberish text. The exact multilingual typography plan is separate P2-12, not automatically fulfilled by switching provider.

## QA checklist
1. Exact PR head CI: marketing contracts, TypeScript, Next.js build; no secure tokens added.
2. Open the PR Preview URL while signed in to SLBI with eligible owner Pro access; test client SDK import and authentication popup from click. If Vercel Deployment Protection disallows external preview, use authorized preview share or owner sign-in.
3. Keep real inference unchecked. Run default no-credit test and confirm it is labeled as a **sample**.
4. For optional genuine A/B comparison, owner intentionally enables real mode, reviews Puter balance, checks consent and clicks once. Compare spelling, text layout and correctness against existing poster; don't assume Qwen 2.1.
5. Check that no usage appears in SLBI growth credit ledger, no Supabase poster job, and no production provider change. Confirm page is never linked/promoted to Basic or public production without owner sign-off.
6. No user Puter account password, token or session data requested, captured or logged.

## Official docs
- https://developer.puter.com/image-generation/
- https://docs.puter.com/Auth/signIn/
- https://docs.puter.com/AI/txt2img/
- https://developer.puter.com/tutorials/puter-auth-token/

## Preview login Cloudflare Turnstile — confirmed blocker 2026-11-16
- The owner followed Vercel Preview link and received `/login?next=/vendor/marketing/design/puter-lab`; the Cloudflare checkbox did not appear and password sign-in could not proceed.
- **Confirmed by non-decrypted Vercel env inventory:** `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` and `CLOUDFLARE_TURNSTILE_SECRET_KEY` are both scoped **only to Production**, whereas the Supabase public URL/anon key are available in Preview. This is not a credential/password error.
- `app/login/page.tsx` rendered a Turnstile using an absent site key, with no message explaining why. `app/api/auth/password-login/route.ts` intentionally requires a valid token and server-side `CLOUDFLARE_TURNSTILE_SECRET_KEY`. Keep it fail-closed; do **not** disable Turnstile or use Cloudflare dummy always-pass keys on a preview that can authenticate real production Supabase users.
- Draft PR #92 adds explicit missing-key and widget-error messages, and disables the password submit button until Turnstile verification has succeeded. Does not disable auth.
- Cloudflare dashboard lacks a connected tool in this environment. To restore functional **real secure login**, owner must create a dedicated `SLBI Puter Lab Preview` Cloudflare Turnstile widget in Managed mode, permitting the **stable branch preview hostname**: `sl-business-index-git-feat-p-0f70a9-victor-dev-03-cmds-projects.vercel.app` (hostname only, no https, path or wildcard). Prefer this stable branch alias over hash-specific deployment URLs so future commits do not require updates. Add both new keys to Vercel project `sl-business-index` > Settings > Environment Variables, target **Preview** with **Git Branch = feat/p2-puter-browser-experiment-20261116** only:
  - `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY` (site key is public)
  - `CLOUDFLARE_TURNSTILE_SECRET_KEY` (server secret; mark Sensitive)
  Do not share keys in chat or GitHub. Do not extend the production Turnstile secret to all Preview branches. Redeploy the branch after adding env keys. Keep production environment untouched.
- **Important:** the URL given to the user must be the STABLE preview alias above, not the immutable deployment URL; test same hostname whitelisted in the widget. The user's Supabase session on `www.slbusinessindex.com` cannot normally be reused on a separate Vercel preview domain. Separate login is expected.
- If the widget appears but sign-in still fails, check recent Vercel preview logs; also validate token hostname server-side if updating auth in future, test Supabase preview cookies and OAuth callback allowlists. Do not claim login fully fixed until owner signs in successfully with valid Turnstile challenge.
- All temporary test keys and bypasses are expressly forbidden in this real-data Preview auth flow. A local synthetic-credential automated test may use dummy Turnstile keys against a disposable auth backend, but not this deployment.
