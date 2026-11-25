import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('WA-03 Connection Lab is inside Marketing Studio and accessible from existing connectors',()=>{
  const connections=read('app/vendor/marketing/engine/(pro)/connections/page.tsx');
  const studio=read('app/vendor/marketing/page.tsx');
  assert.match(connections,/provider\.id==='whatsapp_business'/);
  assert.match(connections,/href="\/vendor\/marketing\/whatsapp"/);
  assert.match(connections,/Open WhatsApp setup/);
  assert.match(studio,/href="\/vendor\/marketing\/whatsapp"/);
  assert.match(studio,/WhatsApp Connection Lab/);
  assert.match(connections,/disabled aria-disabled="true"/); // Other provider connections stay off.
});
test('WA-03 must read authenticated owner business scope on the SERVER, not trust browser business IDs',()=>{
  const route=read('app/vendor/marketing/whatsapp/page.tsx');
  assert.match(route,/createClient/);
  assert.match(route,/auth\.getUser\(\)/);
  assert.match(route,/redirect\('\/login\?redirect=\/vendor\/marketing\/whatsapp'\)/);
  assert.match(route,/from\('businesses'\)/);
  assert.match(route,/\.eq\('owner_id',user\.id\)/);
  assert.match(route,/ownershipReady=true/);
  assert.match(route,/ownershipReady=\{ownershipReady\}/);
  assert.doesNotMatch(route,/SUPABASE_SERVICE_ROLE_KEY|createAdminClient|service_role|cookies\(\).*businessId/);
});
test('WA-03 offers honest, interactive, browser-only visual preview and keeps WhatsApp disconnected',()=>{
  const ui=read('app/vendor/marketing/components/WhatsAppConnectionLab.tsx');
  assert.match(ui,/'use client'/);
  assert.match(ui,/useState\(/);
  assert.match(ui,/businesses\.find\(b=>b\.id===businessId\)/);
  assert.match(ui,/setDemo\(true\)/);
  assert.match(ui,/disabled=\{!canPreview\}/);
  assert.match(ui,/Not connected · Preview only/);
  assert.match(ui,/Local UI demo · No AI run/);
  assert.match(ui,/no actual message received/i);
  assert.match(ui,/No verification code is issued/);
  assert.match(ui,/WhatsApp connection remains NOT CONNECTED/);
  assert.match(ui,/role="status"/);
  assert.doesNotMatch(ui,/fetch\(|axios\.|localStorage|sessionStorage|new WebSocket|window\.location\.assign/);
  assert.doesNotMatch(ui,/ACCESS_TOKEN|SERVICE_ROLE|APP_SECRET|graph\.facebook\.com/);
});
test('WA-03 does not change the official WhatsApp connector into a connected provider',()=>{
  const registry=read('lib/marketing/engine-registry.ts');
  assert.match(registry,/id:'whatsapp_business'/);
  assert.match(registry,/status:'planned'/);
  const app=read('app/vendor/marketing/whatsapp/page.tsx');
  assert.doesNotMatch(app,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  const ui=read('app/vendor/marketing/components/WhatsAppConnectionLab.tsx');
  assert.match(ui,/Meta.*eligibility|eligibility.*Meta/i);
  assert.match(ui,/real linking and sending remain disabled|real WhatsApp connection can be enabled/);
});

test('WA-03 secure setup button visibly expands an immediate inline four-step walkthrough',()=>{
  const ui=read('app/vendor/marketing/components/WhatsAppConnectionLab.tsx');
  assert.match(ui,/const \[setupOpen,setSetupOpen\]=useState\(false\)/);
  assert.match(ui,/const \[setupStep,setSetupStep\]=useState\(0\)/);
  assert.match(ui,/aria-expanded=\{setupOpen\} aria-controls="wa03-setup-preview"/);
  assert.match(ui,/setSetupOpen\(current=>!current\)/);
  assert.match(ui,/id="wa03-setup-preview" role="region"/);
  assert.match(ui,/Preview step \{setupStep\+1\} of \{safeguards\.length\}/);
  assert.match(ui,/setSetupStep\(step=>Math\.min\(safeguards\.length-1,step\+1\)\)/);
  assert.match(ui,/setSetupStep\(step=>Math\.max\(0,step-1\)\)/);
  assert.match(ui,/Finish demo/);
  assert.match(ui,/No verification code is issued here/);
  assert.match(ui,/Demo only · Not connected/);
  assert.doesNotMatch(ui,/fetch\(|axios\.|localStorage|sessionStorage|new WebSocket/);
});
