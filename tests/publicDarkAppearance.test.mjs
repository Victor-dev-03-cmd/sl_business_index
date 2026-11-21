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
