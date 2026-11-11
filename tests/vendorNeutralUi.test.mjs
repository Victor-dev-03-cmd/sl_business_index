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

test('Settings Studio uses version-free Tailwind neumorphism and responsive controls',()=>{
  assert.match(settings,/data-testid="vendor-settings-studio"/);
  assert.doesNotMatch(settings,/settings-studio\.css|vendor-settings-v\d+|settings-v\d+-/);
  assert.match(settings,/lg:grid-cols-\[250px_minmax\(0,1fr\)\]/);
  assert.match(settings,/xl:grid-cols-2/);
  assert.match(settings,/shadow-\[inset_4px_4px_8px_/);
  assert.match(settings,/flex flex-col gap-2 sm:flex-row/);
  assert.match(settings,/onClick=\{addKeyword\}/);
  assert.match(settings,/onClick=\{\(\)=>void saveOptimization\(\)\}/);
  assert.doesNotMatch(styles,/vendor-settings-v\d+|settings-v\d+-/);
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
  const routes=['my-businesses','leads','reviews','insights','growth','marketing','qr-code','billing'];
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

test('Settings retains five real data-backed sections and accessible form controls',()=>{
  for(const tab of ['profile','verification','optimization','notifications','security'])
    assert.ok(settings.includes("activeTab==='"+tab+"'"),'missing panel '+tab);
  for(const action of ['saveProfile','submitVerification','saveOptimization','savePreferences','changePassword'])
    assert.ok(settings.includes(action),'missing action '+action);
  for(const label of ['vendor-email','vendor-name','verification-business','seo-business','vendor-seo-keyword','vendor-password','vendor-confirm'])
    assert.ok(settings.includes('htmlFor="'+label+'"'),'missing label '+label);
  assert.match(settings,/aria-label="Vendor settings sections"/);
  assert.match(settings,/NEXT_PUBLIC_VERIFICATION_PRIVATE_READY/);
  assert.match(settings,/supabase\.auth\.updateUser/);
  assert.match(settings,/const field='block h-12/);
  assert.match(settings,/md:grid-cols-2/);
});
test('orange-charcoal V9 spans dashboard, Tools and Account without generic green UI surfaces',()=>{
  const routes=['dashboard','my-businesses','leads','reviews','insights','growth','marketing','qr-code','billing'];
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
