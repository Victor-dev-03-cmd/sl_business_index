import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const explorer=source('app/nearby/NearbyExplorer.tsx');
const styles=source('app/nearby/nearby-map.css');
const shared=source('app/components/MobilePublicDock.tsx');

test('Nearby has a single, page-owned, mobile navigator',()=>{
  const exclusion=shared.slice(shared.indexOf('const excluded='),shared.indexOf('if(excluded.some'));
  assert.match(exclusion,/['"]\/nearby['"]/);
  assert.match(shared,/pathname\.startsWith\(route\+'\/'\)/);
  assert.match(explorer,/aria-label="Nearby page views"/);
  const localNav=explorer.slice(explorer.indexOf('aria-label="Nearby page views"'));
  assert.match(localNav,/<span>Map<\/span>/);
  assert.match(localNav,/<span>Listings<\/span>/);
  assert.match(localNav,/<span>Filters<\/span>/);
  assert.match(localNav,/slbi-nearby-tabs/);
  assert.match(localNav,/grid-cols-3/);
  assert.match(localNav,/setMobileView\("map"\)/);
  assert.match(localNav,/setMobileView\("list"\)/);
  assert.match(localNav,/onClick=\{openFilters\}/);
  assert.doesNotMatch(localNav,/mobilePublicTabs/);
});

test('Mobile results use compact summary instead of the multirow diagnostic block',()=>{
  assert.match(explorer,/slbi-nearby-root/);
  assert.match(explorer,/slbi-nearby-header/);
  assert.match(explorer,/slbi-nearby-feed-header/);
  assert.match(explorer,/slbi-nearby-results-scroll grid min-h-0 flex-1/);
  assert.match(explorer,/slbi-nearby-mobile-summary/);
  assert.match(explorer,/aria-label="Sort nearby businesses"/);
  assert.match(explorer,/value=\{sortBy\} onChange=\{event => setSortBy\(event.target.value as SortMode\)\}/);
  assert.match(explorer,/mt-2\.5 hidden flex-wrap items-center justify-between gap-3 md:flex/);
  assert.match(explorer,/mt-2\.5 hidden flex-wrap items-center justify-between gap-2 md:flex/);
  assert.match(explorer,/Semantic V3 Beta · ON/);
  assert.match(explorer,/className="mx-auto hidden max-w-\[1800px\] items-center justify-between gap-3 border-t border-\[#EBF0F4\]/);
  assert.match(styles,/@media \(max-width: 767px\)/);
  assert.match(styles,/\.slbi-nearby-root\s*\{[^}]*height: 100dvh;/);
  assert.match(styles,/\.slbi-nearby-results-scroll\s*\{[^}]*-webkit-overflow-scrolling: touch;/);
});

test('Cards are readable, have working actions and do not crowd the mobile screen',()=>{
  assert.match(explorer,/slbi-nearby-card group rounded-\[14px\]/);
  assert.match(explorer,/slbi-nearby-card-photo flex h-\[70px\] w-\[70px\]/);
  assert.match(explorer,/slbi-nearby-card-actions grid w-full grid-cols-4/);
  assert.match(explorer,/slbi-nearby-card-footer/);
  for(const required of [
    'showBusinessOnMap(business)',
    'https://www.google.com/maps/dir/?api=1&destination=',
    'href={"tel:"',
    '"/business/" + (business.slug || business.id)',
    'getBusinessDisplayAddress(business)',
    'business.distanceText',
  ])assert.ok(explorer.includes(required),required);
  assert.match(explorer,/md:hidden">Map<\/span>/);
  assert.match(explorer,/md:hidden">Profile<\/span>/);
  assert.match(styles,/\.slbi-nearby-card-actions > \*\s*\{[^}]*white-space: nowrap;/);
  assert.match(styles,/@media \(max-width: 359px\)/);
});

test('Nearby mobile layout is scoped; original map/search and V3 logic remain',()=>{
  assert.match(explorer,/rankSemanticV3Beta/);
  assert.match(explorer,/resolveSmartSearch/);
  assert.match(explorer,/sortGeoRank/);
  assert.match(explorer,/const LeafletMap = dynamic/);
  assert.match(explorer,/aria-label="Search nearby businesses and services"/);
  assert.match(explorer,/aria-label="Choose district or town"/);
  assert.match(explorer,/aria-label="Nearby search filters"/);
  assert.match(explorer,/aria-label="Interactive business map"/);
  assert.match(styles,/\.slbi-nearby-tabs/);
  assert.doesNotMatch(styles,/\.slbi-home-/);
});
