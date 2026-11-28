import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Fast route transitions give same-tap feedback for link and router.push, without trapping taps',()=>{
  const root=read('app/RootClientLayout.tsx');
  const indicator=read('app/components/RouteNavigationFeedback.tsx');
  const dock=read('app/components/MobilePublicDock.tsx');
  const home=read('app/HomePageClient.tsx');
  const hero=read('app/components/HeroSearch.tsx');
  assert.match(root,/<RouteNavigationFeedback\s*\/>/);
  assert.match(indicator,/document.addEventListener\('click',handleClick,true\)/);
  assert.match(indicator,/data-slbi-route-feedback="true"/);
  assert.match(indicator,/Opening page…/);
  assert.match(indicator,/pointer-events-none/);
  assert.match(indicator,/usePathname\(\)/);
  assert.match(indicator,/url\.pathname===window\.location\.pathname/);
  assert.match(indicator,/setOpening\(false\)/);
  assert.match(indicator,/window.setTimeout\(clear,9000\)/);
  assert.match(indicator,/window.addEventListener\('slbi:navigation-start',onProgrammaticNavigation\)/);
  assert.match(hero,/window.dispatchEvent\(new Event\("slbi:navigation-start"\)\)/);
  assert.match(home,/window.dispatchEvent\(new Event\("slbi:navigation-start"\)\)/);
  assert.match(dock,/SmartPrefetchLink/);
  assert.match(dock,/prefetch:false/);
  assert.match(home,/<SmartPrefetchLink/);
  assert.match(read('app/MobileHomeExperience.tsx'),/<SmartPrefetchLink/);
  assert.match(dock,/'\/business\/'\+encodeURIComponent/);
  assert.doesNotMatch(dock,/window.location.assign/);
});

test('Streaming route-level skeleton exists before Supabase business metadata finishes',()=>{
  const rootLoading=read('app/loading.tsx');
  const businessLoading=read('app/business/[slug]/loading.tsx');
  assert.match(rootLoading,/role="status"/);
  assert.match(rootLoading,/Loading page content…/);
  assert.match(businessLoading,/data-slbi-business-route-skeleton="true"/);
  assert.match(businessLoading,/Opening business profile/);
  assert.doesNotMatch(businessLoading,/supabase|fetch\(/);
  const businessPage=read('app/business/[slug]/page.tsx');
  assert.match(businessPage,/import \{cache\} from 'react'/);
  assert.match(businessPage,/const getBusinessDetails=cache\(/);
  assert.match(businessPage,/generateMetadata/);
});

test('Business profile map is loaded only as location area approaches viewport',()=>{
  const page=read('app/business/[slug]/BusinessDetailsClient.tsx');
  const map=read('app/business/[slug]/DeferredBusinessMap.tsx');
  assert.match(page,/<DeferredBusinessMap lat=\{lat\} lng=\{lng\} business=\{business\}/);
  assert.match(map,/IntersectionObserver/);
  assert.match(map,/rootMargin:"200px 0px"/);
  assert.match(map,/if\(!node\)return/);
  assert.match(map,/observer.disconnect\(\)/);
  assert.match(map,/inView\s*\n?\s*\?<LeafletMap/);
  assert.match(map,/dynamic\(\(\)=>import\("@\/components\/LeafletMap"\)/);
  assert.doesNotMatch(page,/import\("@\/components\/LeafletMap"\)/);
  assert.match(page,/isApprovedVerifiedBusiness\(business\)/);
});

test('Mobile Home removes invisible desktop component trees without SSR hydration mismatch',()=>{
  const home=read('app/HomePageClient.tsx');
  assert.match(home,/useState\(true\)/);
  assert.match(home,/window.matchMedia\('\(min-width: 640px\)'\)/);
  assert.match(home,/setRenderDesktopSections\(media.matches\)/);
  assert.match(home,/media.removeEventListener\?\.\('change',update\)/);
  assert.match(home,/\{renderDesktopSections&&<>/);
  assert.match(home,/if\(!renderDesktopSections\)return/);
  assert.match(home,/\[renderDesktopSections, categoriesLoading/);
  assert.match(home,/\[renderDesktopSections, featuredLoading/);
  assert.match(home,/<MobileHomeExperience/);
});

test('Only a brief cold-open logo, and search suggestions use touch and keyboard click',()=>{
  const loader=read('app/components/LoadingProvider.tsx');
  const hero=read('app/components/HeroSearch.tsx');
  assert.match(loader,/setShowIntro\(false\), 160/);
  assert.doesNotMatch(loader,/setShowIntro\(false\), 1000/);
  assert.match(hero,/onClick=\{\(\)\s*=>\s*handleCategoryClick\(cat.name\)\}/);
  assert.match(hero,/onClick=\{\(\)\s*=>\s*\{\s*window.dispatchEvent\(/);
  assert.doesNotMatch(hero,/onMouseDown=\{\(\)=>router.push/);
});

test('P2 bounded prefetch respects network and route boundaries',async()=>{
 const {canPrefetch,eligiblePublicRoute,createPrefetchBudget}=await import('../lib/navigation/prefetch-policy.ts');
 assert.equal(canPrefetch({saveData:true}),false);
 for(const effectiveType of ['slow-2g','2g','3g'])assert.equal(canPrefetch({effectiveType}),false);
 assert.equal(canPrefetch({downlink:1}),false);
 assert.equal(canPrefetch({},false),false);
 assert.equal(canPrefetch({},true,false),false);
 assert.equal(canPrefetch({effectiveType:'4g',downlink:5}),true);
 for(const href of ['/admin/dashboard','/vendor/dashboard','/register-business','/nearby','/login','//evil.test','/business/a?preview=1','/business/../admin'])assert.equal(eligiblePublicRoute(href),false);
 const reserve=createPrefetchBudget();
 assert.equal(reserve('/business/a',0),true);
 assert.equal(reserve('/business/a',1),false);
 for(const href of ['/business/b','/category','/about'])assert.equal(reserve(href,1),true);
 assert.equal(reserve('/business/c',2),false);
 assert.equal(reserve('/business/c',30001),true);
 assert.equal(reserve('/business/a',30001),false);
 assert.equal(reserve('/business/a',60001),true);
 const link=read('app/components/SmartPrefetchLink.tsx');
 assert.match(link,/prefetch=\{false\}/);
 assert.match(link,/observer.disconnect\(\)/);
 assert.match(link,/canPrefetch\(net,navigator.onLine,document.visibilityState/);
});
