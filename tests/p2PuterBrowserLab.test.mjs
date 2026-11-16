import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const lab=read('app/vendor/marketing/design/puter-lab/page.tsx');
const parent=read('app/vendor/marketing/design/layout.tsx');
const provider=read('lib/marketing/poster-image-provider.ts');

test('Puter lab is isolated under the existing server-side Pro/staff review gate',()=>{
  assert.match(parent,/MarketingProOnly/);
  assert.match(parent,/isPosterReviewAccount/);
  assert.match(lab,/Preview experiment/);
  assert.doesNotMatch(lab,/SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_PUTER_TOKEN|GEMINI_API_KEY/);
  assert.doesNotMatch(lab,/\/api\/marketing\/poster\/generate|marketing_poster_claim|growth_credits|storage\.from/);
});
test('browser-only Puter SDK requires no user tokens and only starts on click',()=>{
  assert.match(lab,/https:\/\/js\.puter\.com\/v2\//);
  assert.match(lab,/client\.auth\.signIn\(\)/);
  assert.match(lab,/client\.ai\.txt2img\(prompt\.trim\(\),\{/);
  assert.match(lab,/test_mode:!realMode/);
  assert.match(lab,/onClick=\{\(\)=>void generate\(\)\}/);
  assert.match(lab,/setRealMode\(e\.target\.checked\);setConsent\(false\)/);
  assert.match(lab,/realMode&&!consent/);
  assert.match(lab,/may consume my Puter AI allowance or create a charge/);
  assert.doesNotMatch(lab,/localStorage|sessionStorage|cookies\.set|fetch\('/);
});
test('test mode is labeled as sample rather than claiming successful model inference',()=>{
  assert.match(lab,/This is NOT a real model-quality evaluation/);
  assert.match(lab,/no-credit SDK test/);
  assert.match(lab,/Qwen Image 2\.1 has not been verified/);
  assert.match(lab,/qwen\/qwen-image-2\.0/);
});
test('the production image provider is unchanged by the optional experiment',()=>{
  assert.match(provider,/const CF_MODEL='@cf\/black-forest-labs\/flux-2-klein-4b'/);
});

test('Preview password login fails closed with an explicit Turnstile config warning',()=>{
  const login=read('app/login/page.tsx');
  const backend=read('app/api/auth/password-login/route.ts');
  assert.match(login,/const turnstileSiteKey = process\.env\.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY\?\.trim\(\)/);
  assert.match(login,/turnstileSiteKey \? \(/);
  assert.match(login,/Secure password sign-in is not configured on this Preview deployment/);
  assert.match(login,/Cloudflare verification could not load for this website address/);
  assert.match(login,/disabled=\{loading \|\| !turnstileSiteKey \|\| turnstileLoadFailed \|\| !turnstileToken\}/);
  assert.match(backend,/const secret = process\.env\.CLOUDFLARE_TURNSTILE_SECRET_KEY/);
  assert.match(backend,/if \(!secret\)/);
  assert.match(backend,/https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.doesNotMatch(login,/turnstileSiteKey \|\| '1x00000000000000000000AA'/);
  assert.doesNotMatch(backend,/1x0000000000000000000000000000000AA/);
});
