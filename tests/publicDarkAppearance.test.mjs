import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('dark mode is opt-in, persisted and scoped to public pages',()=>{
 const css=read('app/public-dark-theme.css'),control=read('app/components/PublicAppearance.tsx');
 for(const color of ['#101010','#181818','#222222','#FF7900','#FF9633','#F5F5F5'])assert.ok(css.includes(color));
 assert.ok(css.includes('html[data-slbi-theme="dark"]'));
 assert.ok(control.includes('slbi-appearance-v1'));
 assert.ok(control.includes('prefers-color-scheme: dark'));
 assert.ok(control.includes('localStorage.setItem'));
 assert.ok(control.includes("section!=='admin'&&section!=='vendor'"));
 assert.ok(read('app/layout.tsx').includes('public-dark-theme.css'));
 assert.ok(read('app/RootClientLayout.tsx').includes('<AppearanceController />'));
});
test('existing main navigation remains intact',()=>{
 const nav=read('app/components/Navbar.tsx');
 assert.equal((nav.match(/<AppearanceControl \/>/g)||[]).length,3);
 assert.ok(nav.includes('MobileDrawerLink href="/" label="Home" iconName="home-2"'));
 assert.ok(read('app/components/MobilePublicDock.tsx').includes('grid-cols-5'));
});

test('Header appearance shortcut sits next to the notification bell and shares the persisted preference',()=>{
 const nav=read('app/components/Navbar.tsx'),control=read('app/components/PublicAppearance.tsx'),css=read('app/components/header-appearance.css');
 assert.match(nav,/<NotificationBell \/>\s*<HeaderThemeToggle \/>/);
 assert.ok(control.includes("saveMode(resolvedDark()?'light':'dark')"));
 assert.ok(control.includes("system.addEventListener('change',update)"));
 assert.ok(control.includes("window.addEventListener(changeEvent,sync)"));
 assert.ok(control.includes('Switch to light mode'));
 assert.ok(control.includes('Switch to dark mode'));
 assert.ok(css.includes('html[data-slbi-theme="dark"] .slbi-header-theme-toggle .slbi-theme-sun'));
 assert.ok(css.includes('@media(max-width:374px)'));
});

test('dark surface and map colors override production utility specificity',()=>{
 const css=read('app/public-dark-theme.css');
 assert.match(css,/\.slbi-home-hero\{background:#181818!important/);
 assert.match(css,/\.slbi-hero-search-form\{background-color:#222222!important/);
 assert.match(css,/\.bg-white(?=[,\s{])[\s\S]*?\{background-color:#222222!important/);
 assert.ok(read('app/components/HeroDiscoveryGraphic.tsx').includes('data-slbi-hero-map="true"'));
 assert.ok(css.includes('[stop-color="#67E2B0"]{stop-color:#FF7900!important;'));
});

test('theme switches avoid duplicate writes and transient color animation',()=>{
 const css=read('app/public-dark-theme.css'),control=read('app/components/PublicAppearance.tsx');
 assert.ok(control.includes('if(root.dataset.slbiTheme===next)return false'));
 assert.ok(control.includes('suppressSwitchTransitions()'));
 assert.ok(control.includes('requestAnimationFrame(releaseSwitch)'));
 assert.ok(control.includes("removeAttribute('data-slbi-theme-switching')"));
 assert.ok(!control.includes('window.addEventListener(changeEvent,update)'));
 assert.equal((control.match(/localStorage\.getItem\(key\)/g)||[]).length,1);
 assert.match(css,/html\[data-slbi-theme-switching\] \*::after\s*\{\s*transition-property:none!important/);
 assert.ok(!css.includes('[class~="bg-white"]'));
 assert.ok(css.includes('.bg-\\[\\#FCFAF6\\]'));
});

test('late-mounted public surfaces have explicit dark palette hooks',()=>{
 const css=read('app/public-dark-theme.css');
 const supports={
 'app/components/AuthButton.tsx':['sign-in','profile-menu','profile-summary','profile-role','sign-out'],
 'app/components/Navbar.tsx':['sign-in','resources-menu','account-drawer','industry-bar'],
 'app/components/CategorySubNavbar.tsx':['industry-menu','industry-intro','industry-icon'],
 'app/components/CategoriesMenu.tsx':['categories-menu'],
 'app/components/LiveCounter.tsx':['live-trigger','live-dot'],
 'app/components/LiveVisitorsPanel.tsx':['live-panel','live-map','live-island','live-world','live-grid'],
 'app/components/NotificationBell.tsx':['notifications-menu'],
 'app/components/GoogleAnalyticsTracker.tsx':['analytics-preferences','analytics-allow'],
 'app/components/HeroSearch.tsx':['area-dropdown','search-dropdown'],
 'components/PushNotificationToggle.tsx':['push-control']
 };
 for(const [p,hooks] of Object.entries(supports))for(const hook of hooks){
  assert.ok(read(p).includes('data-slbi-ui="'+hook+'"'),p+':'+hook);
  assert.ok(css.includes('[data-slbi-ui="'+hook+'"]'),hook);
 }
 assert.ok(css.includes('[data-slbi-ui="sign-in"][href="/login"]{background-color:#FF7900!important'));
 assert.ok(css.includes('[data-slbi-ui="live-world"]{filter:'));
 assert.ok(css.includes('[data-slbi-ui="profile-menu"] [role="menuitem"]'));
});


test('information pages and SVG artwork have scoped dark styling',()=>{
 const css=read('app/info-dark-theme.css'),root=read('app/layout.tsx');
 assert.ok(root.includes('import "./info-dark-theme.css"'));
 for(const p of ['about','faq','contact'])assert.ok(read('app/'+p+'/page.tsx').includes('data-slbi-info-page="'+p+'"'));
 for(const id of ['constellation','journey','privacy'])assert.ok(read('app/about/AboutGraphics.tsx').includes('data-slbi-info-art="'+id+'"'));
 assert.ok(read('app/faq/page.tsx').includes('data-slbi-info-art="faq"'));
 assert.ok(css.includes('text[fill="#183a2c"]'));
 assert.ok(css.includes('[stop-color="#d6ebda"]'));
 assert.ok(css.includes('[aria-label="FAQ categories"]'));
 assert.ok(css.includes('outline:2px solid #FF9633!important'));
 const business=read('app/business/[slug]/BusinessDetailsClient.tsx');
 for(const id of ['call','enquiry','save','share'])assert.ok(business.includes('data-slbi-action-icon="'+id+'"'));
 assert.ok(css.includes('[data-slbi-action-icon="call"]{background-color:#16A34A!important'));
 assert.ok(css.includes('img[src*="/business-actions/"]{filter:none!important'));
});


test('hero focus, category detail and Nearby tiles use scoped dark appearance',()=>{
 const css=read('app/public-dark-theme.css');
 const category=read('app/category/[slug]/page.tsx');
 const nearby=read('app/nearby/NearbyExplorer.tsx');
 assert.ok(category.includes('data-slbi-category-hero="true"'));
 assert.ok(category.includes('data-slbi-category-grid="true"'));
 assert.ok(category.includes('data-slbi-category-guide="true"'));
 assert.ok(css.includes('body .slbi-hero-search-form:focus-within'));
 assert.ok(css.includes('box-shadow:0 0 0 2px #FF9633'));
 assert.ok(css.includes('[data-slbi-category-hero]{background-color:#181818!important'));
 assert.ok(nearby.includes('data-slbi-nearby-map="true"'));
 assert.ok(nearby.includes('tileProvider="osm"'));
 assert.ok(css.includes('[data-slbi-nearby-map] .leaflet-tile-pane{filter:invert(1)'));
 assert.ok(!css.includes('[data-slbi-nearby-map] .leaflet-marker-pane{filter:'));
 assert.ok(css.includes('[data-slbi-nearby-map] .leaflet-control-attribution a'));
});

test('Nearby dark palette prioritizes readable text and role-specific action colors',()=>{
 const css=read('app/nearby/nearby-map.css'), source=read('app/nearby/NearbyExplorer.tsx');
 for(const role of ['map','directions','call','profile'])assert.ok(source.includes('data-nearby-action="'+role+'"'));
 for(const role of ['category','address','distance'])assert.ok(source.includes('data-nearby-text="'+role+'"'));
 for(const [role,color] of [['map','#8EBEFF'],['directions','#80DFC1'],['call','#86E6A1'],['profile','#FFB56B']])assert.ok(css.includes('[data-nearby-action="'+role+'"]{color:'+color+'!important'));
 assert.ok(css.includes('html[data-slbi-theme="dark"] body .slbi-nearby-root .slbi-nearby-card h3{color:#F5F5F5!important'));
 assert.ok(css.includes('[data-nearby-selected="true"]'));
 assert.ok(css.includes('button[aria-pressed="false"]'));
 assert.ok(source.includes('tileProvider="osm"'));
});
