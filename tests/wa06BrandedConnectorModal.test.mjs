import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('All recognizable connector brands use bundled MIT SVG marks, never shared plug icons',()=>{
 const grid=read('app/vendor/marketing/engine/components/ConnectorGrid.tsx');
 for(const slug of ['whatsapp','facebook','instagram','messenger','gmail','outlook','linkedin','youtube','tiktok']){
  const svgPath='public/connector-icons/'+slug+'.svg';
  assert.ok(existsSync(new URL('../'+svgPath,import.meta.url)),svgPath);
  assert.match(read(svgPath),/^<svg /);
  assert.doesNotMatch(read(svgPath),/<script|onload\s*=|foreignObject/i);
  assert.ok(grid.includes("'"+slug+"'"),slug);
 }
 assert.match(read('public/connector-icons/LICENSE.txt'),/MIT License/);
 assert.match(grid,/\/connector-icons\//);
});

test('Every connector opens the same centered accessible modal; WhatsApp remains inside it',()=>{
 const grid=read('app/vendor/marketing/engine/components/ConnectorGrid.tsx');
 const page=read('app/vendor/marketing/engine/(pro)/connections/page.tsx');
 assert.match(grid,/<Dialog.Root/);
 assert.match(grid,/<Dialog.Overlay/);
 assert.match(grid,/<Dialog.Content/);
 assert.match(grid,/left-1\/2 top-1\/2/);
 assert.match(grid,/<Dialog.Title/);
 assert.match(grid,/<Dialog.Description/);
 assert.match(grid,/<Dialog.Close/);
 assert.match(grid,/aria-label="Close connection popup"/);
 assert.match(grid,/MARKETING_CONNECTORS.map/);
 assert.match(grid,/onClick=\{\(\)=>setSelected\(item.id\)\}/);
 assert.match(grid,/current.id==='whatsapp_business'/);
 assert.match(grid,/WhatsAppConnectorSetup/);
 assert.doesNotMatch(grid,/href="\/vendor\/marketing\/whatsapp"/);
 assert.doesNotMatch(grid,/<textarea|window\.location\.assign/);
 assert.match(page,/businesses=\{connectorBusinesses\}/);
 assert.match(page,/auth\.getUser\(\)/);
 assert.match(page,/\.eq\('owner_id',user\.id\)/);
});

test('WhatsApp setup offers legitimate phone and Meta QR coexistence without fake QR or connected status',()=>{
 const ui=read('app/vendor/marketing/engine/components/WhatsAppConnectorSetup.tsx');
 assert.match(ui,/WhatsApp Business App coexistence/);
 assert.match(ui,/setMethod\('phone'\)/);
 assert.match(ui,/setMethod\('qr'\)/);
 assert.match(ui,/E164\.test\(phone\.trim\(\)\)/);
 assert.match(ui,/Meta will verify number ownership/);
 assert.match(ui,/cannot safely create a WhatsApp Web QR/);
 assert.match(ui,/ownerConfirmed/);
 assert.match(ui,/vendorOnboardingAvailable/);
 assert.match(ui,/connections\.some\(c=>c.status==='connected'\)/);
 assert.match(ui,/marketingSendsAvailable/);
 assert.match(ui,/testConsent/);
 assert.match(ui,/\/api\/vendor\/marketing\/whatsapp\/test-message/);
 assert.match(ui,/!testAvailable/);
 assert.doesNotMatch(ui,/setConnected\(true\)|setVerified\(true\)|localStorage|sessionStorage/);
});

test('WhatsApp onboarding and test messaging APIs verify same-origin, Supabase auth and owned approved business',()=>{
 for(const path of [
  'app/api/vendor/marketing/whatsapp/onboarding/start/route.ts',
  'app/api/vendor/marketing/whatsapp/test-message/route.ts',
 ]){
  const src=read(path);
  assert.match(src,/auth\.getUser\(\)/);
  assert.match(src,/request\.headers\.get\('origin'\)/);
  assert.match(src,/new URL\(request\.url\)\.origin/);
  assert.match(src,/\.eq\('owner_id',user\.id\)/);
  assert.match(src,/business\.status!=='approved'/);
  assert.match(src,/Cache-Control/);
  assert.doesNotMatch(src,/SUPABASE_SERVICE_ROLE_KEY|\.insert\(|\.upsert\(|\.update\(|\.delete\(|graph\.facebook\.com|fetch\('https:\/\/graph/);
 }
 const start=read('app/api/vendor/marketing/whatsapp/onboarding/start/route.ts');
 const send=read('app/api/vendor/marketing/whatsapp/test-message/route.ts');
 assert.match(start,/meta_approval_pending/);
 assert.match(send,/vendor_test_messaging_not_approved/);
 assert.match(send,/messageSent:false/);
 assert.doesNotMatch(send,/messageSent:true/);
});

test('Existing Meta sandbox webhook stays independent; Google preview unchanged and production-disabled',()=>{
 const hook=read('app/api/integrations/whatsapp/webhook/route.ts');
 assert.match(hook,/inspectWA03BInbound/);
 assert.match(hook,/verifyWA03BChallenge/);
 const runtime=read('lib/marketing/oauth-runtime.ts');
 assert.match(runtime,/env.VERCEL_ENV!=='preview'/);
 const page=read('app/vendor/marketing/engine/(pro)/connections/page.tsx');
 assert.match(page,/getGooglePreviewConfig\(\)/);
 assert.match(page,/GoogleMailPreviewConnect/);
});
