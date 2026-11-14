import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('vendor boot renders a neutral skeleton rather than a blocking full-page spinner',()=>{
  const vendor=read('app/vendor/layout.tsx');
  const skeleton=read('app/vendor/components/VendorBootSkeleton.tsx');
  assert.match(vendor,/if\(isLoading\)return <VendorBootSkeleton\/>/);
  assert.doesNotMatch(vendor,/animate-spin/);
  assert.match(skeleton,/aria-busy="true"/);
  assert.match(skeleton,/motion-reduce:animate-none/);
  assert.match(skeleton,/sr-only/);
  assert.match(skeleton,/grid-cols-2/);
});

test('Marketing Studio has route-level loading boundaries with no fake data or spinners',()=>{
  const s=read('app/vendor/marketing/components/MarketingRouteSkeleton.tsx');
  assert.match(s,/aria-busy="true"/);
  assert.match(s,/Loading marketing apps and campaign activity/);
  assert.match(s,/motion-reduce:animate-none/);
  assert.match(s,/min-h-\[225px\]/);
  assert.doesNotMatch(s,/animate-spin|fakeRevenue|placeholderEmail|Math.random/);
  const routes=[
    'marketing/loading.tsx','marketing-engine/loading.tsx',
    'marketing/engine/loading.tsx','marketing/campaigns/loading.tsx',
    'marketing/design/loading.tsx','marketing/brand/loading.tsx',
    'marketing/captions/loading.tsx','marketing-engine/(pro)/loading.tsx',
    'marketing/engine/(pro)/loading.tsx','dashboard/loading.tsx',
  ];
  for(const p of routes)assert.match(read('app/vendor/'+p),/MarketingRouteSkeleton/);
});

test('Marketing Studio avoids sequential entitlement fetches and expensive prefetch of Pro routes',()=>{
  const page=read('app/vendor/marketing/page.tsx');
  const store=read('app/vendor/marketing/components/MarketingAppStore.tsx');
  assert.match(page,/await Promise\.all\(\[/);
  assert.match(page,/getMarketingAccessForUser\(user\.id,client\)/);
  assert.match(page,/\.eq\('owner_id',user\.id\)/);
  assert.match(store,/useDeferredValue\(search\)/);
  assert.match(store,/memo\(function AppTile/);
  assert.match(store,/prefetch=\{false\}/);
  assert.match(store,/filterMarketingStudioApps/);
  assert.match(store,/href=\{app\.href\}/);
});

test('Google consent control is preview-only, business-selected and fails closed',()=>{
  const page=read('app/vendor/marketing/engine/(pro)/connections/page.tsx');
  const ui=read('app/vendor/marketing/engine/components/GoogleMailPreviewConnect.tsx');
  const api=read('app/api/marketing/oauth/google_mail/start/route.ts');
  assert.match(page,/getGooglePreviewConfig\(\)/);
  assert.match(page,/process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(page,/auth\.getUser\(\)/);
  assert.match(page,/from\('marketing_connections'\)/);
  assert.match(page,/\.eq\('user_id',user\.id\)/);
  assert.match(page,/\.eq\('owner_id',user\.id\)/);
  assert.match(page,/provider\.id==='gmail'/);
  assert.match(page,/disabled aria-disabled="true"/);
  assert.match(ui,/JSON\.stringify\(\{businessId\}\)/);
  assert.match(ui,/credentials:'same-origin'/);
  assert.match(ui,/next\.origin!=='https:\/\/accounts\.google\.com'/);
  assert.match(ui,/window\.location\.assign\(next\.href\)/);
  assert.match(ui,/role="alert"/);
  assert.match(ui,/aria-busy=\{busy\}/);
  assert.match(api,/getMarketingAccessForUser/);
  assert.match(api,/slbi_begin_marketing_oauth_intent/);
  assert.doesNotMatch(ui,/service_role|CLIENT_SECRET|refreshToken|accessToken/);
  const runtime=read('lib/marketing/oauth-runtime.ts');
  assert.match(runtime,/env\.VERCEL_ENV!=='preview'/);
  assert.doesNotMatch(ui,/sendEmail\(|publishApproved\(/);
});
