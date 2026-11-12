import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/vendor/my-businesses/[id]/edit/EditBusinessForm.tsx', import.meta.url), 'utf8');

test('vendor image uploads are constrained to safe raster formats and a 5 MB size cap', () => {
  for (const mime of ['image/jpeg', 'image/png', 'image/webp']) assert.ok(source.includes(mime));
  assert.match(source, /MAX_IMAGE_BYTES = 5 \* 1024 \* 1024/);
  assert.match(source, /file\.size > MAX_IMAGE_BYTES \|\| file\.size === 0/);
  assert.match(source, /validateBusinessImage\(file\)/);
});

test('a valid authenticated owner is checked before a file is uploaded', () => {
  const ownerCheck = source.indexOf("if (user.id !== business.owner_id)");
  const firstUpload = source.indexOf(".upload(filePath, logo)");
  assert.ok(ownerCheck > 0 && firstUpload > ownerCheck, 'Ownership must be verified before storage writes');
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /\.eq\('owner_id', user\.id\)/);
});

test('database update must return a saved row and must not silently claim success', () => {
  assert.match(source, /\.select\('id'\)\s*\.maybeSingle\(\)/);
  assert.match(source, /if \(!savedBusiness\) throw new Error/);
  assert.match(source, /setSuccess\(true\)/);
  assert.ok(source.indexOf("if (!savedBusiness)") < source.indexOf('setSuccess(true)'), 'Success may only follow confirmed persistence');
  assert.doesNotMatch(source, /status:\s*['"]approved['"]/);
});

test('a failed update cleans up only new uploads without touching existing assets', () => {
  assert.match(source, /const newUploadPaths: string\[\] = \[\]/);
  assert.match(source, /newUploadPaths\.push\(filePath\)/g);
  assert.match(source, /\.from\('business-logos'\)\.remove\(newUploadPaths\)/);
  assert.doesNotMatch(source, /remove\(\[business\.logo_url/);
});

test('public business-logo storage remains private to uploader for writes', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20261112194811_p0_business_logos_owner_isolation.sql', import.meta.url), 'utf8');
  assert.match(migration, /DROP POLICY IF EXISTS "Authenticated Upload to business-logos"/);
  assert.match(migration, /DROP POLICY IF EXISTS "Authenticated Update to business-logos"/);
  assert.match(migration, /DROP POLICY IF EXISTS "Authenticated Delete from business-logos"/);
  assert.doesNotMatch(migration, /DELETE FROM storage\.objects|TRUNCATE/);
});
