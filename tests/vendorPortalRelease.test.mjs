import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const layout=load('app/vendor/layout.tsx');
const actions=load('app/vendor/components/VendorQuickActions.tsx');
const style=load('app/vendor/vendor-workspace.css');
const settings=load('app/vendor/settings/page.tsx');
const marketing=load('app/vendor/marketing/page.tsx');
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
  assert.match(layout,/vendor-sidebar/);
  assert.match(layout,/ctrlKey/);
  assert.match(layout,/metaKey/);
  assert.match(layout,/aria-label="Mobile vendor quick navigation"/);
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
    assert.ok(load(path).includes('vendor-premium-'),'no shared design style in '+path);
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

test('marketing and QR studios avoid invented reach and offer functional links',()=>{
  assert.match(marketing,/vendor-premium-header/);
  assert.match(marketing,/vendor\/insights/);
  assert.doesNotMatch(marketing,/2\.5k - 5k impressions/);
  assert.doesNotMatch(marketing,/toast\.info\('Advanced optimization in progress/);
  assert.doesNotMatch(marketing,/View Stats/);
  assert.match(qr,/vendor-premium-header/);
  assert.match(qr,/checkingQR/);
  assert.match(qr,/vendor\/insights/);
  assert.doesNotMatch(qr,/Trackable Scans/);
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
