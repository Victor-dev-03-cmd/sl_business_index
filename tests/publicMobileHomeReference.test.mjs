import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readSavedBusinesses,saveBusinessLocally} from '../lib/public-saved-businesses.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const home=read('app/HomePageClient.tsx');
const search=read('app/components/HeroSearch.tsx');
const navbar=read('app/components/Navbar.tsx');
const root=read('app/RootClientLayout.tsx');
const dock=read('app/components/MobilePublicDock.tsx');
const styles=read('app/home-mobile.css');
const icons=read('app/components/BrandIcon.tsx');
const details=read('app/business/[slug]/BusinessDetailsClient.tsx');
const saved=read('app/saved/page.tsx');
const notifications=read('app/notifications/page.tsx');

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
  assert.match(styles,/min-height:calc\(100svh - 76px\)/);
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
  for(const href of ['/', '/search','/saved','/notifications','/register-business']){
    assert.ok(dock.includes("href:'"+href+"'"),href);
  }
  for(const icon of ['home-2','search-normal','bookmark-2','notification','add-square']){
    assert.ok(dock.includes("icon:'"+icon+"'"),icon);
  }
  assert.match(dock,/aria-label="Mobile quick navigation"/);
  assert.match(dock,/aria-current=\{active\?'page':undefined\}/);
  assert.match(dock,/safe-area-inset-bottom/);
  assert.match(dock,/pathname\.startsWith\(route\+'\/'\)/);
  assert.match(dock,/md:hidden/);
  assert.match(dock,/focusin/);
  assert.match(navbar,/href="\/notifications" aria-label="View notifications"/);
  assert.match(navbar,/name="profile-circle"/);
  assert.match(navbar,/setMobileMenuOpen\(value => !value\)/);
  assert.match(navbar,/aria-expanded=\{mobileMenuOpen\}/);
  assert.match(icons,/import\("iconsax"\)/);
  for(const icon of ['bookmark-2','notification','add-square','profile-circle']){
    assert.ok(icons.includes('"'+icon+'":'),icon+' icon SVG fallback');
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
