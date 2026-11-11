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

test('Settings Optimization V10 uses a bounded editor with visible Save and no clipped Add button',()=>{
  assert.match(settings,/vendor-settings-v10/);
  assert.match(settings,/settings-v10-opt/);
  assert.match(settings,/settings-v10-intro/);
  assert.match(settings,/settings-v10-content/);
  assert.match(settings,/settings-v10-keyword-row/);
  assert.match(settings,/settings-v10-keyword-input/);
  assert.match(settings,/settings-v10-add-button/);
  assert.match(settings,/settings-v10-save-card/);
  assert.match(settings,/settings-v10-save-button/);
  assert.match(settings,/onClick=\{addKeyword\}/);
  assert.match(settings,/onClick=\{\(\)=>void saveOptimization\(\)\}/);
  assert.match(settings,/disabled=\{saving\|\|!selectedBusinessId\}/);
  assert.match(styles,/Vendor Settings V10/);
  assert.match(styles,/\.settings-v10-keyword-row \{/);
  assert.match(styles,/grid-template-columns:minmax\(0,1fr\) 108px/);
  assert.match(styles,/\.settings-v10-keyword-input \{/);
  assert.match(styles,/width:100%!important/);
  assert.match(styles,/\.settings-v10-save-button \{/);
  assert.match(styles,/\.settings-v10-side-column \{/);
  assert.match(styles,/@media\(max-width:420px\)/);
  assert.doesNotMatch(settings,/vendor-keyword-input min-w-0 flex-1/);
});

test('centered desktop top navigation exposes reversible, dismissible dropdowns with restrained corners',()=>{
  assert.match(vendorLayout,/vendor-topbar-center absolute left-1\/2 hidden -translate-x-1\/2/);
  assert.match(vendorLayout,/min-\[1400px\]:flex/);
  assert.match(vendorLayout,/min-\[1400px\]:hidden/);
  assert.match(vendorLayout,/aria-expanded=\{openMenu==='tools'\}/);
  assert.match(vendorLayout,/aria-expanded=\{openMenu==='account'\}/);
  assert.match(vendorLayout,/setOpenMenu\(open=>open==='tools'\?null:'tools'\)/);
  assert.match(vendorLayout,/setOpenMenu\(open=>open==='account'\?null:'account'\)/);
  assert.match(vendorLayout,/addEventListener\('pointerdown',onPointerDown\)/);
  assert.match(vendorLayout,/event\.key==='Escape'/);
  assert.doesNotMatch(vendorLayout,/<details|<summary/);
  assert.match(styles,/\.vendor-topbar-dropdown-panel \{/);
  assert.match(styles,/\.vendor-topbar-dropdown-link \{border-radius:6px;\}/);
});

test('owner workspace pages share restrained V7 shell without losing independent page flows',()=>{
  const routes=['my-businesses','leads','reviews','insights','growth','marketing','qr-code','billing','settings'];
  for(const route of routes){
    const page=read('app/vendor/'+route+'/page.tsx');
    assert.match(page,/vendor-page-v7/,'missing shared shell: '+route);
    if(!['settings','insights'].includes(route)){
      assert.match(page,/vendor-owner-heading/,'missing header style: '+route);
      assert.doesNotMatch(page,/border-t-4 border-t-\[#2D6749\]/,'outdated thick green header: '+route);
    }
  }
  for(const selector of ['.vendor-owner-heading','.vendor-premium-header','.vendor-executive-card','.vendor-topbar-dropdown-panel']){
    assert.ok(styles.includes(selector),'missing restrained style: '+selector);
  }
  assert.match(styles,/\.vendor-workspace-v6 \.vendor-page-v7 table thead/);
  assert.match(styles,/border-left:3px solid #FF7900/);
});

test('V8 Settings rebuild keeps five working panels, labeled fields and explicit actions',()=>{
  assert.match(settings,/vendor-settings-v8/);
  assert.match(settings,/settings-v8-hero/);
  assert.match(settings,/settings-v8-rail/);
  assert.match(settings,/settings-v8-preference-list/);
  assert.match(settings,/settings-v8-form-grid/);
  assert.match(settings,/aria-selected=\{activeTab===item.id\}/);
  for(const tab of ['profile','verification','optimization','notifications','security'])
    assert.ok(settings.includes("activeTab==='"+tab+"'"),'missing settings section '+tab);
  for(const action of ['saveProfile','submitVerification','saveOptimization','savePreferences','changePassword'])
    assert.ok(settings.includes(action),'missing action '+action);
  assert.doesNotMatch(settings,/bg-\[#E7F1D5\]/);
  assert.match(styles,/Vendor Settings V8/);
  assert.match(styles,/\.vendor-workspace-v6 \.vendor-settings-v8 \.settings-v8-hero/);
  assert.match(styles,/\.vendor-workspace-v6 \.vendor-settings-v8 :is\(input,textarea,select\)\.vendor-field/);
  assert.match(styles,/border-color:#F4A362/);
});

test('orange-charcoal V9 spans dashboard, Tools and Account without generic green UI surfaces',()=>{
  const routes=['dashboard','my-businesses','leads','reviews','insights','growth','marketing','qr-code','billing','settings'];
  for(const route of routes){
    const page=read('app/vendor/'+route+'/page.tsx');
    assert.match(page,/vendor-page-v9/,'missing v9 surface: '+route);
  }
  const editForm=read('app/vendor/my-businesses/[id]/edit/EditBusinessForm.tsx');
  const hybrid=read('app/vendor/billing/hybrid/page.tsx');
  assert.match(editForm,/vendor-page-v9/);
  assert.match(hybrid,/vendor-page-v9/);
  assert.match(styles,/Vendor Portal V9/);
  assert.match(styles,/--vendor-highlight:#FF7900/);
  assert.match(styles,/prefers-reduced-motion/);
});
