import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const lab=read('app/vendor/marketing/design/puter-lab/page.tsx');
const labGate=read('app/vendor/marketing/design/puter-lab/layout.tsx');
const parent=read('app/vendor/marketing/design/layout.tsx');
const provider=read('lib/marketing/poster-image-provider.ts');

test('lab has owner-only server authorization with an existing verified DB grant',()=>{
  assert.match(parent,/MarketingProOnly/);
  assert.match(labGate,/createClient/);
  assert.match(labGate,/auth\.getUser\(\)/);
  assert.match(labGate,/isPosterInternalQAAccount\(user\.id,client\)/);
  assert.match(labGate,/notFound\(\)/);
  assert.match(lab,/Private owner QA experiment/);
  assert.doesNotMatch(labGate,/user\.email|user_metadata|NEXT_PUBLIC_PUTER_LAB/);
  assert.doesNotMatch(lab,/SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_PUTER_TOKEN|GEMINI_API_KEY/);
  assert.doesNotMatch(lab,/\/api\/marketing\/poster\/generate|marketing_poster_claim|growth_credits|storage\.from/);
});
test('browser-only Puter SDK needs no credentials and inference starts only on click',()=>{
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
test('documented model IDs only; sample image must not be called a real inference',()=>{
  assert.match(lab,/This is NOT a real model-quality evaluation/);
  assert.match(lab,/no-credit SDK test/);
  assert.match(lab,/openai\/gpt-image-2\.6-flare/);
  assert.match(lab,/google\/gemini-3-pro-image/);
  assert.match(lab,/black-forest-labs\/flux-2-pro/);
  assert.match(lab,/qwen\/qwen-image/);
  assert.doesNotMatch(lab,/qwen\/qwen-image-2\.0|google\/gemini-3-pro-image-preview/);
});
test('normal cloudflare poster generation and login verification remain intact',()=>{
  const login=read('app/login/page.tsx');
  const backend=read('app/api/auth/password-login/route.ts');
  assert.match(provider,/const CF_MODEL='@cf\/black-forest-labs\/flux-2-klein-4b'/);
  assert.match(login,/siteKey=\{process\.env\.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY!\}/);
  assert.match(backend,/const secret = process\.env\.CLOUDFLARE_TURNSTILE_SECRET_KEY/);
  assert.match(backend,/https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.doesNotMatch(lab,/CLOUDFLARE_TURNSTILE_SECRET_KEY|SLBI_POSTER_IMAGE_PROVIDER/);
});
