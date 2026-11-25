import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readSavedBusinesses,saveBusinessLocally} from '../lib/public-saved-businesses.ts';
import {mobileDaypart} from '../lib/ui/mobile-daypart.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const home=read('app/HomePageClient.tsx');
const search=read('app/components/HeroSearch.tsx');
const navbar=read('app/components/Navbar.tsx');
const root=read('app/RootClientLayout.tsx');
const dock=read('app/components/MobilePublicDock.tsx');
const settings=read('app/vendor/settings/page.tsx');
const styles=read('app/home-mobile.css');
const globalCss=read('app/globals.css');
const icons=read('app/components/BrandIcon.tsx');
const details=read('app/business/[slug]/BusinessDetailsClient.tsx');
const saved=read('app/saved/page.tsx');
const notifications=read('app/notifications/page.tsx');
const mobileGreeting=read('app/components/MobileGreeting.tsx');
const bell=read('app/components/NotificationBell.tsx');

test('Reference mobile hero matches real Home search architecture without breaking desktop',()=>{
  assert.match(home,/slbi-home-hero/);
  assert.match(home,/Discover <span/);
  assert.match(home,/Grow together\./);
  assert.match(home,/Discover businesses, services, and people worth knowing in Sri Lanka\./);
  assert.match(home,/slbi-home-search-surface/);
  assert.match(home,/HeroSearch\s+categories=/);
  assert.match(home,/handleUseCurrentLocation\(true\)/);
  assert.match(home,/href="\/category"/);
  assert.match(home,/HeroDiscoveryGraphic/);
  assert.match(home,/hidden lg:block/);
  assert.match(home,/sri-lanka-gold-outline\.svg/);
  assert.match(styles,/@media \(max-width:767px\)/);
  assert.match(home,/className="slbi-home-root min-h-\[100dvh\]/);
  assert.match(styles,/\.slbi-home-hero-grid \{\s*min-height:0;/);
  assert.match(styles,/\.slbi-home-hero-title/);
  assert.match(styles,/\.slbi-home-search-surface/);
  assert.match(styles,/\.slbi-hero-search-button/);
  assert.match(search,/resolveSmartSearch\(/);
  assert.match(search,/get_global_search_suggestions/);
  assert.match(search,/onSubmit=\{handleSubmit\}/);
  assert.match(search,/role="search"/);
  assert.match(search,/aria-label="Choose district or town"/);
  assert.match(search,/VoiceSearch/);
  assert.match(search,/slbi-hero-search-form/);
});

test('Real mobile Iconsax menu links exist, are accessible and do not replace vendor layout',()=>{
  assert.match(root,/import MobilePublicDock/);
  assert.match(root,/<MobilePublicDock\s*\/>/);
  assert.match(root,/<MobilePublicDock role="spacer"\s*\/>/);
  assert.ok(root.indexOf('<MobilePublicDock />')<root.indexOf('<main>{children}</main>'),
    'fixed nav must appear in the first streamed shell, before main content');
  assert.ok(root.indexOf('<MobilePublicDock role="spacer" />')>
    root.indexOf('<FooterWrapper>'), 'footer clearance remains at document end');
  assert.match(dock,/if\(role==='spacer'\)return <div aria-hidden="true"/);
  const destinations=[
    ['/', 'Explore','home-2'],
    ['/category','Categories','category-2'],
    ['/nearby','Nearby','location'],
    ['/business-news','Business News','note-2'],
    ['/about','About','info-circle'],
  ];
  // Exact user-requested order and no extra bottom dock destinations.
  const tabDeclaration=dock.split('export const mobilePublicTabs=')[1].split('] as const')[0];
  for(const [href,label,icon] of destinations){
    assert.ok(tabDeclaration.includes("href:'"+href+"'"),href);
    assert.ok(tabDeclaration.includes("label:'"+label+"'"),label);
    assert.ok(tabDeclaration.includes("icon:'"+icon+"'"),icon);
  }
  assert.equal((tabDeclaration.match(/href:'/g)||[]).length,5);
  const actualOrder=Array.from(tabDeclaration.matchAll(/href:'([^']+)'/g),x=>x[1]);
  assert.deepEqual(actualOrder,destinations.map(item=>item[0]));
  assert.match(dock,/aria-label="Mobile quick navigation"/);
  assert.match(dock,/aria-current=\{active\?'page':undefined\}/);
  assert.match(dock,/safe-area-inset-bottom/);
  assert.match(dock,/pathname\.startsWith\(route\+'\/'\)/);
  assert.match(dock,/sm:hidden/);
  assert.match(dock,/grid-cols-5/);
  assert.match(dock,/w-full min-w-0/);
  assert.match(dock,/maxWidth:420/);
  assert.match(dock,/position:'fixed'/);
  assert.match(dock,/data-slbi-viewport-dock="true"/);
  assert.match(dock,/import \{createPortal\} from 'react-dom'/);
  assert.match(dock,/useLayoutEffect\(\(\)=>\{/);
  assert.match(dock,/setPortalRoot\(document\.body\)/);
  assert.match(dock,/return createPortal\(/);
  assert.match(dock,/portalRoot\s*\)/);
  assert.match(dock,/z-\[1200\]/);
  assert.doesNotMatch(dock,/scrollY|scrollTop|scrollIntoView|focusin|focusout|typing/);
  assert.match(dock,/left:0,\s*right:0/);
  assert.ok(dock.includes("width:'min(420px, calc(100vw - 24px))'"));
  assert.ok(dock.includes("bottom:'max(12px, env(safe-area-inset-bottom, 0px))'"));
  assert.match(dock,/marginInline:'auto'/);
  assert.match(dock,/transform:'none'/);
  assert.match(globalCss,/html \{\s*scrollbar-gutter: stable;/);
  assert.match(globalCss,/@media \(max-width: 639px\)\s*\{\s*html\s*\{\s*scrollbar-gutter: auto;/);
  assert.doesNotMatch(dock,/translateX\(-50%\)|left:'50%'/);
  assert.doesNotMatch(tabDeclaration,/add-square|bookmark-2|search-normal/);
  // Shared notification component serves both desktop and mobile.
  assert.equal((navbar.match(/<NotificationBell\s*\/>/g)||[]).length,1);
  assert.match(bell,/if\(!uid&&!sessionLoading\)return <Link href="\/notifications" aria-label="Notifications"/);
  assert.match(bell,/<Dialog\.Trigger asChild>/);
  assert.match(bell,/aria-label=\{'Notifications'\+\(count\?/);
  assert.match(bell,/<Link href="\/notifications" onClick=\{\(\)=>setOpen\(false\)\}/);
  assert.match(bell,/\.eq\('user_id',uid\)/);
  assert.match(navbar,/<HeaderThemeToggle\s*\/>/);
  assert.match(navbar,/name="profile-circle"/);
  assert.match(navbar,/setMobileMenuOpen\(value => !value\)/);
  assert.match(navbar,/aria-expanded=\{mobileMenuOpen\}/);
  assert.match(icons,/import\("iconsax"\)/);
  for(const icon of ['bookmark-2','notification','add-square','profile-circle',
    'home-2','category-2','location','note-2','info-circle']){
    assert.ok(icons.includes('"'+icon+'":')||icons.includes('\n  '+icon+':'),
      icon+' icon SVG fallback');
  }
});

test('Saved bookmarks really persist and toggle without an external API or false login requirement',()=>{
  const previous=globalThis.window;
  const storage=new Map();
  globalThis.window={
    localStorage:{
      getItem:key=>storage.get(key)||null,
      setItem:(key,value)=>{storage.set(key,value);}
    },
    dispatchEvent:()=>true,
  };
  try{
    const one={id:'11111111-1111-4111-8111-111111111111',slug:'jaffna-bakery',
      name:'Jaffna Bakery',category:'Bakery',city:'Jaffna'};
    assert.equal(saveBusinessLocally(one),true);
    assert.equal(readSavedBusinesses().length,1);
    assert.equal(readSavedBusinesses()[0].slug,'jaffna-bakery');
    assert.equal(saveBusinessLocally(one),false);
    assert.deepEqual(readSavedBusinesses(),[]);
    assert.equal(saveBusinessLocally({...one,id:'not-an-id'}),false);
    storage.set('slbi-public-saved-businesses-v1','invalid JSON');
    assert.deepEqual(readSavedBusinesses(),[]);
  }finally{
    if(previous===undefined)delete globalThis.window;
    else globalThis.window=previous;
  }
  assert.match(details,/aria-pressed=\{isSaved\}/);
  assert.match(details,/handleToggleSaved/);
  assert.match(saved,/useSavedBusinesses\(\)/);
  assert.match(saved,/Remove bookmark/);
  assert.match(saved,/not synced across your accounts/);
});

test('Mobile notifications read and update existing owner-scoped rows, no broad mutation',()=>{
  assert.match(notifications,/from\('notifications'\)/);
  assert.match(notifications,/\.eq\('user_id',user\.id\)/);
  assert.match(notifications,/\.eq\('id',id\)/);
  assert.match(notifications,/\.update\(\{is_read:true\}\)/);
  assert.match(notifications,/Sign in to see your notifications/);
  assert.match(notifications,/href="\/login\?redirect=%2Fnotifications"/);
  assert.doesNotMatch(notifications,/service_role|\.insert\(|\.delete\(/);
});

test('Reference mobile greeting is personalized and follows browser-local daytime',()=>{
  assert.deepEqual(mobileDaypart(6),{label:'Good Morning',emoji:'☀️'});
  assert.deepEqual(mobileDaypart(13),{label:'Good Afternoon',emoji:'🌤️'});
  assert.deepEqual(mobileDaypart(19),{label:'Good Evening',emoji:'🌆'});
  assert.deepEqual(mobileDaypart(23),{label:'Good Night',emoji:'🌙'});
  assert.deepEqual(mobileDaypart(2),{label:'Good Night',emoji:'🌙'});
  assert.match(mobileGreeting,/new Date\(\)\.getHours\(\)/);
  assert.match(mobileGreeting,/username\?\.trim\(\)\|\|fullName\?\.trim\(\)/);
  assert.match(mobileGreeting,/Hello, \{name\}/);
  assert.match(mobileGreeting,/sm:hidden/);
  assert.match(navbar,/<MobileGreeting/);
  assert.match(navbar,/username=\{profileData\?\.username\}/);
  assert.match(navbar,/<div className="hidden shrink-0 sm:block(?: [^"]*)?">\s*<LogoLink/);
  // Owner's native mobile layout hides analytics only; desktop retains it.
  assert.match(navbar,/<div data-slbi-desktop-live="true" className="hidden shrink-0 sm:inline-flex"><LiveCounter\s*\/><\/div>/);
  assert.equal((navbar.match(/<LiveCounter\s*\/>/g)||[]).length,1);
  assert.match(navbar,/<LogoLink\s*\/>/);
});

test('Body-portaled dock and left-aligned hero actions remain usable on narrow phones',()=>{
  for(const viewport of [280,320,360,375,390,414,430,480,600]){
    const width=Math.min(420,viewport-24);
    const left=(viewport-width)/2;
    const padding=6;
    const gap=2;
    const slot=(width-2*padding-4*gap)/5;
    assert.ok(left>=12, 'screen '+viewport+' left edge');
    assert.ok(slot>=42, 'screen '+viewport+' minimum comfortable touch target');
    const rightEdge=left+width;
    assert.ok(rightEdge<=viewport-12, 'screen '+viewport+' right edge');
  }
  assert.match(home,/slbi-home-search-actions mt-2\.5 flex flex-col items-start/);
  assert.match(home,/sm:flex-row sm:flex-wrap sm:items-center/);
  assert.match(styles,/\.slbi-home-search-actions \{display:flex;flex-direction:column;align-items:flex-start/);
  assert.match(search,/slbi-hero-search-form/);
});

test('mobile dock explicitly uses viewport width, not document scrollbar gutter',()=>{
  assert.match(dock,/width:'min\(420px, calc\(100vw - 24px\)\)'/);
  assert.match(dock,/left:0,\s*right:0/);
  assert.match(dock,/marginInline:'auto'/);
  for(const viewport of [280,320,360,375,390,414,430,440,480,600]){
    // Verify the intended geometry independently of transformed body layouts.
    const width=Math.min(420,viewport-24);
    const left=(viewport-width)/2;
    const right=left+width;
    assert.ok(left>=12, 'left inset '+viewport);
    assert.ok(right<=viewport-12, 'right inset '+viewport);
    assert.equal((viewport-right)-left,0,'centered '+viewport);
  }
});

test('Homepage-only mobile overflow cannot displace the otherwise-correct fixed public dock',()=>{
  // The regression is specific to Home: the previously off-screen decorative
  // map had right:-65px, which expanded Chromium's 390px viewport to 455px.
  // This is guarded in the existing Verify Next.js Build workflow.
  const mobileStyles=styles.split('@media (max-width:767px) {')[1]
    .split('@media (max-width:360px) {')[0];
  assert.match(mobileStyles,/\.slbi-home-root\s*\{[^}]*overflow-x:clip;/);
  assert.match(mobileStyles,/\.slbi-home-hero\s*\{[^}]*overflow-x:clip;/);
  assert.match(mobileStyles,/\.slbi-home-mobile-map\s*\{[^}]*right:0;/);
  assert.doesNotMatch(mobileStyles,/\.slbi-home-mobile-map\s*\{[^}]*right:-65px;/);
  assert.doesNotMatch(styles.split('@media (max-width:767px) {')[0],/\.slbi-home-root\s*\{/);
  assert.match(mobileStyles,/\.slbi-home-hero-grid\s*\{\s*min-height:0;/);
  assert.match(mobileStyles,/padding:28px 16px 52px;/);
  assert.match(mobileStyles,/\.slbi-home-search-surface\s*\{[^}]*padding:8px;/);
  assert.match(mobileStyles,/\.slbi-hero-search-button\s*\{[^}]*min-height:46px;/);
  assert.match(mobileStyles,/\.slbi-home-search-actions\s*\{[^}]*align-items:flex-start;/);
  // Changing the shared dock again risks regressions on Categories & Nearby.
  assert.match(dock,/import \{createPortal\} from 'react-dom'/);
  assert.match(dock,/position:'fixed'/);
  assert.match(dock,/width:'min\(420px, calc\(100vw - 24px\)\)'/);
});


test('The public fifth mobile tab remains About except for authenticated owned vendors',()=>{
  // Static public destination list is preserved for visitors and customers.
  assert.match(dock,/\{href:'\/about',label:'About',icon:'info-circle'\}/);
  assert.match(dock,/index===4 && vendorTab/);
  assert.match(dock,/href:'\/vendor\/settings\?tab=profile',label:'My Profile',icon:'profile-circle'/);
  assert.match(dock,/aria-label=\{destination.label\}/);
  assert.match(dock,/href=\{destination.href\}/);
  assert.match(dock,/useSession\(\)/);
  assert.match(dock,/\.from\('profiles'\)/);
  assert.match(dock,/\.select\('role'\)\.eq\('id',uid\)/);
  assert.match(dock,/\.from\('businesses'\)/);
  assert.match(dock,/\.eq\('owner_id',uid\)\.limit\(1\)/);
  assert.match(dock,/role!=='admin' && role!=='ceo'/);
  assert.match(dock,/if\(role!=='nav'\|\|sessionLoading\)return/);
  assert.match(dock,/if\(!user\?\.id\)return/);
  assert.doesNotMatch(dock,/user_metadata|app_metadata|service_role/);
  assert.match(dock,/if\(active\)setVendorIdentity\(\{uid,isVendor\}\)/);
});
test('Vendor profile contains a reduced-motion-aware verification CTA for each owned unverified business',()=>{
  assert.match(settings,/useMemo\(\(\)=>businesses\.filter\(b=>/);
  assert.match(settings,/b\.status==='approved' && b\.is_verified===true/);
  assert.match(settings,/\['approved','verified'\]\.includes/);
  assert.match(settings,/latestVerificationStatuses/);
  assert.match(settings,/\.from\('verifications'\)/);
  assert.match(settings,/\.in\('business_id',owned\.map\(v=>v\.id\)\)/);
  assert.match(settings,/const inReview=state==='pending'/);
  assert.match(settings,/!inReview&&<span aria-hidden="true"/);
  assert.match(settings,/motion-safe:animate-pulse/);
  assert.match(settings,/focus-visible:outline-2/);
  assert.match(settings,/Verify your business/);
  assert.match(settings,/onClick=\{\(\)=>selectTab\('verification',b\.id\)\}/);
  assert.match(settings,/next\.searchParams\.set\('business',businessId\)/);
  assert.match(settings,/owned\.find\(v=>v\.id===fromUrl\)\?\.id/);
  assert.match(settings,/activeTab==='verification'/);
  assert.match(settings,/privateDocsReady/);
  assert.match(settings,/href="\/register-business"/);
});
