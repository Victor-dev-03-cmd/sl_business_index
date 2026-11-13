import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SRI_LANKAN_DISTRICTS, isReadableBusinessArea,
  buildVendorEnteredArea, describeGeolocationFailure,
} from '../lib/businessPinFallback.ts';
import { validateBusinessLocation } from '../lib/businessLocation.ts';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const component = read('components/AddressAutocomplete.tsx');

test('25 Sri Lankan districts including northern and eastern rural localities', () => {
  assert.equal(SRI_LANKAN_DISTRICTS.length, 25);
  assert.equal(new Set(SRI_LANKAN_DISTRICTS).size, 25);
  for (const district of ['Jaffna','Mullaitivu','Vavuniya','Mannar','Kilinochchi','Batticaloa','Trincomalee','Colombo']) {
    assert.ok(SRI_LANKAN_DISTRICTS.includes(district), district);
  }
});

test('manual area requires real town and valid district, never raw GPS coordinates', () => {
  assert.equal(buildVendorEnteredArea('Maharagama', 'Colombo'), 'Maharagama, Colombo District, Sri Lanka');
  assert.equal(buildVendorEnteredArea('Kanagarayankulam', 'Vavuniya'), 'Kanagarayankulam, Vavuniya District, Sri Lanka');
  assert.equal(buildVendorEnteredArea('யாழ்ப்பாணம்', 'Jaffna'), 'யாழ்ப்பாணம், Jaffna District, Sri Lanka');
  assert.equal(buildVendorEnteredArea('මහරගම', 'Colombo'), 'මහරගම, Colombo District, Sri Lanka');
  for (const [locality,district] of [
    ['9.6615, 80.0255', 'Jaffna'], ['a', 'Colombo'], ['', 'Colombo'],
    ['Sri Lanka', 'Jaffna'], ['Maharagama', ''], ['Maharagama', 'Imaginary'],
  ]) assert.equal(buildVendorEnteredArea(locality,district), null, locality);
  assert.equal(isReadableBusinessArea('Jaffna, Northern Province, Sri Lanka'), true);
  assert.equal(isReadableBusinessArea('9.6615, 80.0255'), false);
  assert.equal(isReadableBusinessArea('Sri Lanka'), false);
  assert.equal(isReadableBusinessArea(''), false);
});

test('manual area and independently entered physical address pass existing P1 validation', () => {
  const manualArea = buildVendorEnteredArea('Kanagarayankulam', 'Vavuniya');
  const pin = {lat:9.1,lng:80.45,address:manualArea};
  assert.equal(validateBusinessLocation(pin,'Opposite post office, A9 Road, Kanagarayankulam',true),null);
  assert.match(validateBusinessLocation(pin,'Opposite post office, A9 Road, Kanagarayankulam',false),/Confirm/);
  assert.match(validateBusinessLocation(pin,'',true),/physical address/);
  assert.match(validateBusinessLocation({ ...pin, lat:80.45,lng:9.1},'Opposite post office, A9 Road',true),/Sri Lanka/);
});

test('geolocation distinguishes permission, hardware and timeout failures', () => {
  assert.match(describeGeolocationFailure({code:1}),/denied|Allow location/i);
  assert.match(describeGeolocationFailure({code:2}),/device.*location/i);
  assert.match(describeGeolocationFailure({code:3}),/timed out/i);
  assert.match(describeGeolocationFailure({code:900}),/map pin/i);
});

test('map pins remain available when Google reverse geocoding fails', () => {
  assert.match(component,/setMarkerPosition\(pin\)/);
  assert.match(component,/setPendingPin\(pin\)/);
  assert.match(component,/setManualAreaMode\(true\)/);
  assert.match(component,/getGeocode\(\{ location: pin \}\)/);
  assert.match(component,/locationRequestId\.current !== requestId/);
  assert.match(component,/Enter the village or town and district below/);
  assert.match(component,/openManualArea/);
  assert.match(component,/buildVendorEnteredArea\(manualLocality, manualDistrict\)/);
  assert.match(component,/onLocationSelectAction\(pin\.lat, pin\.lng, address\)/);
  assert.match(component,/Locality entered by the vendor/);
  assert.match(component,/not independently geocoded/);
  assert.doesNotMatch(component,/The map pin has no verified area address/);
  assert.match(component,/name="business-location-confirmed" required/);
  assert.match(component,/onMarkerDragEnd=\{handleMarkerDragEnd\}/);
  assert.match(component,/onMapClick=\{handleMarkerDragEnd\}/);
});

test('GPS retries network location after high-accuracy timeout but not permission denied', () => {
  assert.match(component,/window\.isSecureContext/);
  assert.match(component,/if \(!navigator\.geolocation\)/);
  assert.match(component,/navigator\.geolocation\.getCurrentPosition\(/);
  assert.match(component,/highAccuracy && \(error\.code === 2 \|\| error\.code === 3\)/);
  assert.match(component,/locate\(false\)/);
  assert.match(component,/describeGeolocationFailure\(error\)/);
  assert.match(component,/enableHighAccuracy: highAccuracy/);
  assert.match(component,/maximumAge: highAccuracy \? 120000 : 600000/);
  assert.match(component,/setIsLocating\(false\)/);
});

test('Google autocomplete remains optional; same map picker used in vendor edit and registration', () => {
  assert.match(component,/Google address search is optional/);
  assert.match(component,/Google address suggestions are unavailable/);
  assert.match(component,/SRI_LANKAN_DISTRICTS\.map/);
  assert.match(component,/id="business-manual-locality"/);
  assert.match(component,/id="business-manual-district"/);
  assert.match(component,/onLocationConfirmedChange\?\.\(false\)/);
  const edit = read('app/vendor/my-businesses/[id]/edit/EditBusinessForm.tsx');
  const register = read('app/register-business/page.tsx');
  for(const form of [edit,register]){
    assert.match(form, /AddressAutocomplete/);
    assert.match(form, /validateBusinessLocation\(location, detailedAddress, locationConfirmed\)/);
  }
});
