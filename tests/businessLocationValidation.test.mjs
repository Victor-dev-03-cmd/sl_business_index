import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isPlausibleSriLankaPin, validateBusinessLocation } from '../lib/businessLocation.ts';
import { getBusinessDisplayAddress } from '../lib/businessAddress.ts';

const selectedPin = {
  lat: 9.6615, lng: 80.0255,
  address: 'Jaffna, Northern Province, Sri Lanka',
};
const physical = 'No 12, Main Street, Jaffna';

test('accepted physical address requires a confirmed Sri Lankan map pin', () => {
  assert.equal(validateBusinessLocation(selectedPin, physical, true), null);
  assert.match(validateBusinessLocation(selectedPin, physical, false), /Confirm/i);
  assert.equal(validateBusinessLocation({ ...selectedPin, lat: 5.98, lng: 80.22 }, 'Near Railway Station, Galle', true), null);
});

test('Tamil, Sinhala and rural landmark addresses are accepted without requiring Western street numbers', () => {
  assert.equal(validateBusinessLocation(selectedPin, 'யாழ்ப்பாணம் பிரதான வீதி, கடை 12', true), null);
  assert.equal(validateBusinessLocation(selectedPin, 'යාපනය ප්‍රධාන වීදිය, වෙළඳසැල', true), null);
  assert.equal(validateBusinessLocation(selectedPin, 'Opposite the village post office, Jaffna', true), null);
});

test('invalid and stale coordinates or fake textual addresses cannot be submitted', () => {
  for (const pin of [null,
    { ...selectedPin, lat: 0 },
    { ...selectedPin, lng: 0 },
    { ...selectedPin, lat: 80.0255, lng: 9.6615 },
    { ...selectedPin, lat: Number.NaN },
    { ...selectedPin, lng: Infinity },
  ]) assert.match(validateBusinessLocation(pin, physical, true), /pin/i);

  for (const value of ['', ' ', '9.6615, 80.0255', 'N/A', 'unknown', 'Sri Lanka', 'Test', '123456789012']) {
    assert.notEqual(validateBusinessLocation(selectedPin, value, true), null, value);
  }
  assert.match(validateBusinessLocation({ ...selectedPin, address: '9.6615, 80.0255' }, physical, true), /Coordinates alone/);
  assert.match(validateBusinessLocation({ ...selectedPin, address: 'Sri Lanka' }, physical, true), /Coordinates alone/);
});

test('public map cards show the shop/building and its actual mapped locality', () => {
  assert.equal(getBusinessDisplayAddress({ detailed_address: physical, address: selectedPin.address }),
    'No 12, Main Street, Jaffna, Northern Province, Sri Lanka');
  assert.equal(getBusinessDisplayAddress({ detailed_address: '12 Main Street, Jaffna', address: 'Jaffna' }),
    '12 Main Street, Jaffna');
  assert.equal(getBusinessDisplayAddress({ detailed_address: null, address: '9.6615, 80.0255', city: 'Jaffna' }),
    'Jaffna');
});

test('registration and edit use the same validator, red required stars and explicit confirmation', () => {
  const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const register = read('app/register-business/page.tsx');
  const edit = read('app/vendor/my-businesses/[id]/edit/EditBusinessForm.tsx');
  const address = read('components/AddressAutocomplete.tsx');
  for (const form of [register, edit]) {
    assert.match(form, /validateBusinessLocation\(location, detailedAddress, locationConfirmed\)/);
    assert.match(form, /onLocationClearAction=\{handleLocationClear\}/);
    assert.match(form, /onLocationConfirmedChange=\{setLocationConfirmed\}/);
  }
  assert.match(address, /Physical Address <span className="text-red-600"/);
  assert.match(address, /id="business-physical-address"/);
  assert.match(address, /required\s*\n\s*minLength=\{10\}/);
  assert.match(address, /name="business-location-confirmed" required/);
  assert.match(address, /handleAddressInput/);
  assert.match(address, /clearSelection\(\); \/\/ Typed text must never retain a previous pin/);
  assert.match(address, /draggableMarker=\{markerPosition !== null\}/);
  assert.doesNotMatch(address, /setValue\(\x60\$\{latitude\.toFixed\(6\)\}/);
});

test('edit operations restrict updates to fresh owner identity and validate uploads before storage writes', () => {
  const edit = readFileSync(new URL('../app/vendor/my-businesses/[id]/edit/EditBusinessForm.tsx', import.meta.url), 'utf8');
  assert.match(edit, /\.eq\('owner_id', user\.id\)/);
  assert.match(edit, /\.select\('id'\)\s*\.single\(\)/);
  assert.match(edit, /ALLOWED_IMAGE_TYPES/);
  assert.match(edit, /MAX_IMAGE_BYTES/);
  assert.match(edit, /newlyUploadedPaths/);
});
