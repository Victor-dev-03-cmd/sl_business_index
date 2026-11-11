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

test('owner portal keeps Inter and uses luxury orange/charcoal top navigation',()=>{
  assert.match(root,/const inter = Inter\(/);
  assert.match(styles,/font-family:var\(--font-inter\)/);
  assert.match(styles,/--vendor-orange:#FF7900/);
  assert.match(styles,/--vendor-ink:#1D1D20/);
  assert.match(vendorLayout,/vendor-workspace-v6/);
  assert.match(vendorLayout,/aria-label="Vendor primary navigation"/);
  assert.match(vendorLayout,/aria-label="Vendor compact navigation"/);
  assert.match(vendorLayout,/aria-label="Growth and marketing tools"/);
  assert.match(vendorLayout,/aria-label="Vendor account pages"/);
  assert.doesNotMatch(vendorLayout,/vendor-sidebar|Collapse sidebar|Expand sidebar|Vendor mobile navigation/);
  assert.match(vendorLayout,/bg-\[#FF7900\]/);
  assert.match(styles,/\.vendor-workspace-v6 \.vendor-content/);
});

test('overview uses real owner metrics, orange chart and truthful published-listing ring',()=>{
  assert.match(dashboard,/vendor-dashboard-v6/);
  assert.match(dashboard,/vendor-overview-heading/);
  assert.match(dashboard,/Portfolio pulse/);
  assert.match(dashboard,/Listing readiness/);
  assert.match(dashboard,/Export report/);
  assert.match(dashboard,/onClick=\{exportCsv\}/);
  for(const route of ['/vendor/my-businesses','/vendor/leads','/vendor/insights','/vendor/reviews'])
    assert.ok(dashboard.includes(route));
  for(const metric of ['views','calls','leads','reviews'])
    assert.match(dashboard,new RegExp("id: '"+metric+"'"));
  assert.match(dashboard,/VendorAnalytics businessIds=\{businessIds\}/);
  assert.match(dashboard,/conic-gradient\(#FF7900/);
  assert.match(analytics,/#FF7900/);
  assert.match(analytics,/#28282D/);
  assert.doesNotMatch(dashboard,/Total Revenue|Total Profit|Confirmed Sales/);
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
