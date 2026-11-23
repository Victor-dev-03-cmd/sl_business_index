import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const hero=readFileSync('app/components/HeroSearch.tsx','utf8');
const home=readFileSync('app/HomePageClient.tsx','utf8');
const nearby=readFileSync('app/nearby/NearbyExplorer.tsx','utf8');
const form=readFileSync('components/AddressAutocomplete.tsx','utf8');
const registration=readFileSync('app/register-business/page.tsx','utf8');
const edit=readFileSync('app/vendor/my-businesses/[id]/edit/EditBusinessForm.tsx','utf8');

test('Hero search passes full keyword/category intent to fresh GPS before routing',()=>{
  assert.match(hero,/handleUseCurrentLocation\(true,\s*searchParams\)/);
  assert.match(hero,/handleUseCurrentLocation\(true,\s*params\)/);
  assert.match(home,/requestPreciseLocation\(\{\s*signal/);
  assert.match(home,/new URLSearchParams\(nextSearch\?\.toString\(\)\)/);
  assert.match(home,/params\.set\("source",\s*"gps"\)/);
});
test('Nearby only searches an accepted radius for GPS, including map listings',()=>{
  assert.match(nearby,/location\.kind === "gps"\s*\?\s*\[radius\]/);
  assert.match(nearby,/withinGpsRadius\(/);
  assert.match(nearby,/results = location\.kind === "gps"/);
  assert.match(nearby,/mapFeatures = useMemo\(\(\) => visibleBusinesses/);
  assert.doesNotMatch(nearby,/Colombo · Starting area/);
});
test('registration and edit use shared device GPS, map pin and readable physical address separately',()=>{
  assert.match(form,/requestPreciseLocation\(\{\s*signal/);
  assert.match(form,/handleMarkerDragEnd\(fix\.lat,\s*fix\.lng\)/);
  assert.match(form,/Confirm the pin marks the real business entrance/);
  assert.match(form,/name="business-location-confirmed"/);
  assert.match(registration,/detailed_address:\s*detailedAddress\.trim\(\)/);
  assert.match(registration,/latitude:\s*location\.lat/);
  assert.match(registration,/longitude:\s*location\.lng/);
  assert.match(edit,/detailed_address:\s*detailedAddress\.trim\(\)/);
  assert.match(edit,/latitude:\s*location\.lat/);
  assert.match(edit,/longitude:\s*location\.lng/);
});
