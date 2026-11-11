import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const vendorLayout=read('app/vendor/layout.tsx');
const styles=read('app/vendor/vendor-workspace.css');
const dashboard=read('app/vendor/dashboard/page.tsx');
const analytics=read('app/vendor/dashboard/VendorAnalytics.tsx');
const settings=read('app/vendor/settings/page.tsx');
const root=read('app/layout.tsx');

test('owner portal uses Inter and a neutral slate shell without full green surfaces',()=>{
  assert.match(root,/const inter = Inter\(/);
  assert.match(styles,/font-family:var\(--font-inter\)/);
  assert.match(styles,/\.vendor-workspace \.vendor-sidebar \{\s*background:#202C34;/);
  assert.match(styles,/\.vendor-workspace \.vendor-content \{\s*background:var\(--vendor-canvas\)/);
  assert.match(vendorLayout,/bg-\[#F2F5F7\]/);
  assert.match(styles,/background:#D5EEA8/);
  assert.match(vendorLayout,/color=\{current\?'#283A33':'#B9C6D0'\}/);
});

test('overview follows reference hierarchy: neutral heading, actual links, five real KPIs and graph',()=>{
  assert.match(dashboard,/vendor-dashboard-v5/);
  assert.match(dashboard,/vendor-overview-heading/);
  assert.doesNotMatch(dashboard,/<header className="vendor-premium-header/);
  assert.match(dashboard,/Dashboard section shortcuts/);
  assert.match(dashboard,/Export report/);
  assert.match(dashboard,/onClick=\{exportCsv\}/);
  for(const route of ['/vendor/my-businesses','/vendor/leads','/vendor/insights','/vendor/reviews'])
    assert.ok(dashboard.includes(route));
  for(const metric of ['views','calls','leads','reviews'])
    assert.match(dashboard,new RegExp("id: '"+metric+"'"));
  assert.match(dashboard,/VendorAnalytics businessIds=\{businessIds\}/);
  assert.match(analytics,/#5682E7/);
  assert.match(analytics,/#F09A56/);
});

test('settings has bounded independent cards, real input borders, safe keyword row and responsive controls',()=>{
  assert.match(settings,/vendor-settings-v5/);
  assert.match(settings,/vendor-settings-panels/);
  assert.match(settings,/vendor-settings-navigation/);
  assert.match(settings,/vendor-settings-header/);
  assert.doesNotMatch(settings,/<header className="vendor-premium-header/);
  assert.match(settings,/vendor-keyword-input min-w-0 flex-1/);
  assert.match(settings,/mt-5 flex min-w-0 flex-col gap-2 sm:flex-row/);
  assert.match(styles,/\.vendor-workspace \.vendor-settings-v5 \.vendor-keyword-input \{/);
  assert.match(styles,/width:auto!important/);
  assert.match(styles,/border:1px solid #CAD4DB/);
  assert.match(styles,/\.vendor-settings-v5 \.vendor-settings-savebar/);
});
