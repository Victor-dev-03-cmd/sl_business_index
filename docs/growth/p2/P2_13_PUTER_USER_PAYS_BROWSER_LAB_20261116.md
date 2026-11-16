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
