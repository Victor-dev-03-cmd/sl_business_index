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
  assert.match(vendorLayout,/aria-label="Vendor workspace and tools"/);
  assert.match(vendorLayout,/title:'Account',items:accountNav/);
  assert.match(vendorLayout,/data-slbi-ui="vendor-sidebar"/);
  assert.match(vendorLayout,/aria-label="Vendor mobile navigation"/);
  assert.match(vendorLayout,/Expand sidebar/);
  assert.match(vendorLayout,/Collapse sidebar/);
  assert.match(vendorLayout,/bg-\[#FFF0E5\]/);
  assert.match(styles,/\.vendor-workspace-v6 \.vendor-content/);
});

test('overview uses real owner metrics, orange chart and truthful published-listing ring',()=>{
  assert.match(dashboard,/neo\.page/);
  assert.match(dashboard,/neo\.hero/);
  assert.match(dashboard,/Portfolio pulse/);
  assert.match(dashboard,/Directory publication/);
  assert.match(dashboard,/Growth Command Center/);
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
  assert.match(settings,/data-testid="vendor-seo-keyword-editor"/);
  assert.match(settings,/sm:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(settings,/onSubmit=\{event=>\{event\.preventDefault\(\);addKeyword\(\);\}\}/);
  assert.match(settings,/onClick=\{\(\)=>void saveOptimization\(\)\}/);
  assert.doesNotMatch(styles,/vendor-settings-v\d+|settings-v\d+-/);
});
test('flex topbar never overlaps and sidebar offers keyboard-safe compact navigation',()=>{
  assert.match(vendorLayout,/nav aria-label="Vendor primary navigation"/);
  assert.match(vendorLayout,/min-w-0 flex-1 items-center justify-center/);
  assert.match(vendorLayout,/data-slbi-ui="vendor-sidebar"/);
  assert.match(vendorLayout,/w-\[226px\]/);
  assert.match(vendorLayout,/w-\[70px\]/);
  assert.match(vendorLayout,/onClick=\{\(\)=>setSidebarCollapsed\(v=>!v\)\}/);
  assert.match(vendorLayout,/aria-label="Open navigation"/);
  assert.match(vendorLayout,/aria-modal="true"/);
  assert.match(vendorLayout,/event.key==='Escape'/);
  assert.doesNotMatch(vendorLayout,/vendor-topbar-center absolute left-1\/2/);
});

test('owner workspace pages share restrained V7 shell without losing independent page flows',()=>{
  const routes=['my-businesses','leads','reviews','insights','growth','qr-code','billing'];
  for(const route of routes){
    const page=read('app/vendor/'+route+'/page.tsx');
    assert.match(page,/neo\.page/,'missing shared Tailwind shell: '+route);
    if(!['settings','insights'].includes(route)){
      assert.match(page,/neo\.hero/,'missing neumorphic header: '+route);
      assert.doesNotMatch(page,/border-t-4 border-t-\[#2D6749\]/,'outdated thick green header: '+route);
    }
  }
  const tokens=read('app/vendor/components/neumorphic.ts');
  for(const selector of ['hero:','heroDark:','card:','tile:','inset:','input:'])
    assert.ok(tokens.includes(selector),'missing design token: '+selector);
  // New Marketing Studio is a server-rendered overview with equivalent Tailwind
  // styling rather than a legacy interactive client shell.
  const marketing=read('app/vendor/marketing/page.tsx');
  assert.match(marketing,/rounded-xl border border-\[#ECECF0\]/);
  assert.match(marketing,/bg-\[#1D1D20\]/);
  assert.match(marketing,/bg-\[#FF7900\]/);
  assert.match(marketing,/MarketingAppStore/);
  assert.doesNotMatch(vendorLayout,/name:'Marketing Engine',href:'\/vendor\/marketing-engine'/);
  assert.match(styles,/\.vendor-topbar-dropdown-panel/);
  assert.doesNotMatch(styles,/vendor-page-v7|vendor-page-v9|vendor-settings-v10/);
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
test('orange-charcoal neumorphism spans owner pages without versioned CSS selectors',()=>{
  const routes=['dashboard','my-businesses','leads','reviews','insights','growth','qr-code','billing'];
  for(const route of routes){
    const page=read('app/vendor/'+route+'/page.tsx');
    assert.match(page,/import \{ neo \}/,'missing Tailwind tokens: '+route);
    assert.doesNotMatch(page,/vendor-page-v\d+|vendor-dashboard-v\d+/);
  }
  const editForm=read('app/vendor/my-businesses/[id]/edit/EditBusinessForm.tsx');
  const hybrid=read('app/vendor/billing/hybrid/page.tsx');
  assert.match(editForm,/neo\.card/);
  assert.match(hybrid,/neo\.card/);
  const tokens=read('app/vendor/components/neumorphic.ts');
  assert.match(tokens,/#ff7900/);
  assert.match(tokens,/motion-reduce:transition-none/);
  assert.doesNotMatch(styles,/vendor-settings-v\d+|vendor-page-v\d+/);
});
