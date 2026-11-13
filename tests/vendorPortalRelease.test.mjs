import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const layout=load('app/vendor/layout.tsx');
const actions=load('app/vendor/components/VendorQuickActions.tsx');
const style=load('app/vendor/vendor-workspace.css');
const settings=load('app/vendor/settings/page.tsx');
const marketing=load('app/vendor/marketing/page.tsx');
const campaignWorkspace=load('app/vendor/marketing/campaigns/page.tsx');
const qr=load('app/vendor/qr-code/page.tsx');
const admin=load('app/admin/verifications/page.tsx');
const profileSecurity=load('docs/growth/PRIVILEGE_ESCALATION_GUARD_REVIEW_ONLY.sql');
const storageSecurity=load('docs/growth/VENDOR_SETTINGS_PRIVACY_REVIEW_ONLY.sql');
const basePages=[
  'app/vendor/dashboard/page.tsx','app/vendor/my-businesses/page.tsx',
  'app/vendor/leads/page.tsx','app/vendor/reviews/page.tsx',
  'app/vendor/billing/page.tsx','app/vendor/growth/page.tsx',
  'app/vendor/insights/page.tsx',
];

test('every major owner portal page is reachable and uses a shared premium shell',()=>{
  assert.match(layout,/VendorQuickActions/);
  assert.match(layout,/vendor-workspace\.css/);
  assert.match(layout,/vendor-topbar/);
  assert.doesNotMatch(layout,/vendor-sidebar/);
  assert.match(layout,/ctrlKey/);
  assert.match(layout,/metaKey/);
  assert.match(layout,/aria-label="Vendor compact navigation"/);
  for(const link of [
    '/vendor/dashboard','/vendor/my-businesses','/vendor/leads','/vendor/reviews',
    '/vendor/insights','/vendor/growth','/vendor/marketing','/vendor/qr-code',
    '/vendor/billing','/vendor/settings',
  ]) {
    assert.ok(layout.includes(link),'missing page in nav: '+link);
    assert.ok(actions.includes(link),'missing real quick action: '+link);
  }
  assert.match(style,/prefers-reduced-motion/);
  assert.match(style,/vendor-premium-header/);
  for(const path of basePages) {
    assert.match(load(path),/import \{ neo \}/,'missing shared Tailwind tokens in '+path);
  }
});

test('Settings saves actual account/business data and does not expose fake controls',()=>{
  assert.match(settings,/saveProfile/);
  assert.match(settings,/saveOptimization/);
  assert.match(settings,/savePreferences/);
  assert.match(settings,/supabase\.auth\.updateUser/);
  assert.match(settings,/vendor_notification_preferences/);
  assert.match(settings,/NEXT_PUBLIC_VERIFICATION_PRIVATE_READY/);
  assert.match(settings,/createSignedUrl/);
  assert.match(settings,/storage:\/\/verification-docs\//);
  assert.match(settings,/owner_id',userId/);
  assert.doesNotMatch(settings,/Deactivate Account/);
  assert.doesNotMatch(settings,/defaultChecked=\{i < 2\}/);
  assert.doesNotMatch(settings,/getPublicUrl\(/);
  assert.doesNotMatch(settings,/Higher ranking in search results/);
});

test('GrowthOS Marketing Studio is overview-only and preserves real manual campaigns separately',()=>{
  assert.match(marketing,/Marketing Studio/);
  assert.match(marketing,/from\('businesses'\)/);
  assert.match(marketing,/eq\('owner_id',user\.id\)/);
  assert.match(marketing,/marketing_campaigns/);
  assert.match(marketing,/count:'exact',head:true/);
  assert.match(marketing,/\/vendor\/marketing-engine/);
  assert.match(marketing,/\/vendor\/marketing\/campaigns/);
  assert.doesNotMatch(marketing,/const exportBrandedCreative=|status:schedule\?'scheduled':'drafted'/);
  assert.match(campaignWorkspace,/Campaign Workspace/);
  assert.match(campaignWorkspace,/தமிழ்/);
  assert.match(campaignWorkspace,/සිංහල/);
  assert.match(campaignWorkspace,/Consent-based Email/);
  assert.match(campaignWorkspace,/status:schedule\?'scheduled':'drafted'/);
  assert.match(campaignWorkspace,/external publishing is not automatic/);
  assert.doesNotMatch(campaignWorkspace,/MarketingDesignEditor|EditorCanvas|showEditor|js\.puter\.com/);
  assert.doesNotMatch(marketing,/2\.5k - 5k impressions|View Stats/);
});

test('QR Studio provides branded presets and print/download without fake scan counts',()=>{
  assert.match(qr,/Counter display/);
  assert.match(qr,/Window sticker/);
  assert.match(qr,/Business card/);
  assert.match(qr,/QRCodeCanvas/);
  assert.match(qr,/Download PNG/);
  assert.match(qr,/printCard/);
  assert.match(qr,/copyLink/);
  assert.match(qr,/qr_inventory/);
  assert.match(qr,/vendor\/insights/);
  assert.doesNotMatch(qr,/Trackable Scans|fakeScanCount/);
});

test('Settings layout has responsive Tailwind forms without old stylesheet dependency',()=>{
  assert.match(settings,/data-testid="vendor-settings-studio"/);
  assert.match(settings,/lg:grid-cols-\[250px_minmax\(0,1fr\)\]/);
  assert.match(settings,/aria-label="Settings navigation"/);
  assert.match(settings,/flex flex-col gap-2 sm:flex-row/);
  assert.match(settings,/Save discovery settings/);
  assert.match(settings,/shadow-\[inset_5px_5px_11px_/);
  assert.doesNotMatch(settings,/settings-studio\.css/);
});
test('private verification access is staged without claiming unreviewed RLS is deployed',()=>{
  assert.match(admin,/createSignedUrl/);
  assert.match(admin,/proofObjectPath/);
  assert.match(storageSecurity,/storage\.buckets set public=false/);
  assert.match(storageSecurity,/vendor_notification_preferences/);
  assert.match(storageSecurity,/enable row level security/);
  assert.match(profileSecurity,/slbi_guard_remaining_privileged_writes/);
  assert.match(profileSecurity,/account identity and verification need staff review/);
  assert.match(profileSecurity,/listing audit and engagement fields are protected/);
  assert.match(profileSecurity,/business owner cannot edit submitted verification review/);
  assert.match(profileSecurity,/NOT APPLIED/);
});

test('quick-action settings deep links navigate to real settings tabs',()=>{
  const tabs=['verification','optimization','notifications','security'];
  for(const tab of tabs){
    assert.ok(actions.includes('/vendor/settings?tab='+tab));
    assert.match(settings,new RegExp("id: ?'"+tab+"'"));
  }
  assert.match(settings,/window\.addEventListener\('slbi:settings-tab'/);
  assert.match(settings,/searchParams\.set\('tab',tab\)/);
  assert.match(actions,/dispatchEvent\(new CustomEvent\('slbi:settings-tab'/);
});

test('command palette traps focus and restores it after closing',()=>{
  assert.match(actions,/dialogRef/);
  assert.match(actions,/event\.key!=='Tab'/);
  assert.match(actions,/previous\?\.focus\(\)/);
  assert.match(actions,/aria-modal="true"/);
});
