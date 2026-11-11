import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const marketing=read('app/vendor/marketing/page.tsx');
const upload=read('app/vendor/marketing/components/CreativeLibraryUpload.tsx');
const marketingRls=read('docs/growth/MARKETING_QR_OWNERSHIP_REVIEW_ONLY.sql');
const qr=read('app/vendor/qr-code/page.tsx');
const api=read('app/api/qr/request/route.ts');
const settings=read('app/vendor/settings/page.tsx');
const styles=read('app/vendor/vendor-workspace.css');
const roadmap=read('docs/growth/GROWTH_INTELLIGENCE_V1_FOUNDATION.md');

test('redesigned marketing workspace excludes the legacy canvas editor and fabricated posting',()=>{
  assert.match(marketing,/Marketing Studio/);
  assert.match(marketing,/vendor-premium-header/);
  assert.match(marketing,/makeCaption\(/);
  assert.match(marketing,/language==='Tamil'/);
  assert.match(marketing,/language==='Sinhala'/);
  assert.match(marketing,/marketing_campaigns/);
  assert.match(marketing,/status:shouldSchedule\?'scheduled':'drafted'/);
  assert.match(marketing,/Consent-based email marketing/);
  assert.match(marketing,/External posting is not automatic|not automatically posted or sent/i);
  assert.doesNotMatch(marketing,/MarketingDesignEditor|showEditor|MarketingEditorCanvas|<canvas/);
  assert.doesNotMatch(marketing,/status: ?'posted'/);
  assert.doesNotMatch(marketing,/2\.5k - 5k impressions/);
});

test('QR studio owns its actual QR asset and has print/export/sharing tools',()=>{
  assert.match(qr,/qrRef\.current\?\.querySelector\('svg'\)/);
  assert.match(qr,/QRCodeSVG/);
  assert.match(qr,/exportAsset\('png'\)/);
  assert.match(qr,/exportAsset\('svg'\)/);
  assert.match(qr,/exportAsset\('pdf'\)/);
  assert.match(qr,/navigator\.share/);
  assert.match(qr,/getCanvas\(\)/);
  assert.match(qr,/checkingQR/);
  assert.match(qr,/qr_inventory/);
  assert.match(qr,/vendor-premium-header/);
  assert.match(qr,/vendor\/insights/);
  assert.doesNotMatch(qr,/document\.querySelector\('canvas'\)/);
  assert.doesNotMatch(qr,/Trackable Scans/);
});

test('managed QR assignment validates real user, owns approved business, uses RLS not admin bypass',()=>{
  assert.match(api,/auth\.getUser\(\)/);
  assert.match(api,/\.eq\('owner_id',user\.id\)/);
  assert.match(api,/business\.status!=='approved'/);
  assert.match(api,/isSameOrigin/);
  assert.match(api,/randomBytes\(12\)/);
  assert.match(api,/qr_inventory/);
  assert.match(api,/status:'assigned'/);
  assert.doesNotMatch(api,/service_role|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(api,/Math\.random\(/);
});

test('settings align on mobile and reduce AI-style inflated radii',()=>{
  assert.match(settings,/vendor-settings-layout/);
  assert.match(settings,/vendor-settings-nav/);
  assert.match(settings,/vendor-settings-body/);
  assert.match(settings,/flex flex-col gap-2 sm:flex-row/);
  assert.match(settings,/rounded-md/);
  assert.match(styles,/Settings alignment pass/);
  assert.match(styles,/\.vendor-settings \.vendor-field/);
  assert.match(styles,/border-radius:6px/);
  assert.match(roadmap,/release gate/i);
});

test('creative library accepts reviewed media, does not run canvas publishing',()=>{
  assert.match(marketing,/CreativeLibraryUpload/);
  assert.match(upload,/supabase\.auth\.getUser\(\)/);
  assert.match(upload,/\.eq\('owner_id',user\.id\)/);
  assert.match(upload,/status:'pending'/);
  assert.match(upload,/social_platforms:selected/);
  assert.match(upload,/file\.size>8\*1024\*1024/);
  assert.match(upload,/getPublicUrl\(path\)/);
  assert.doesNotMatch(upload,/MarketingDesignEditor|canvas\.toDataURL/);
  assert.match(marketingRls,/qr_one_assigned_per_business/);
  assert.match(marketingRls,/vendor_id=\(select auth\.uid\(\)\)/);
  assert.match(marketingRls,/b\.id=promotions\.business_id and b\.owner_id=/);
  assert.match(marketingRls,/NOT applied to production/);
});
