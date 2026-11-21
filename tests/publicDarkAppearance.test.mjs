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
 assert.ok(control.includes("media.addEventListener('change',sync)"));
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
 assert.match(css,/\[class~="bg-white"\][\s\S]*?\{background-color:#222222!important/);
 assert.ok(read('app/components/HeroDiscoveryGraphic.tsx').includes('data-slbi-hero-map="true"'));
 assert.ok(css.includes('[stop-color="#67E2B0"]{stop-color:#FF7900!important;'));
});
