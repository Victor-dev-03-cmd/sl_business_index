import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const edit = readFileSync(new URL('../app/vendor/my-businesses/[id]/edit/EditBusinessForm.tsx',import.meta.url),'utf8');

test('business owner auth is checked before storage upload and PostgREST update',()=>{
  const auth=edit.indexOf('supabase.auth.getUser()');
  const upload=edit.indexOf(".from('business-logos')");
  const db=edit.indexOf(".from('businesses')");
  assert.ok(auth>=0 && upload>auth && db>upload);
  assert.match(edit,/currentUser\.id !== business\.owner_id/);
  assert.match(edit,/\.eq\('owner_id', currentUser\.id\)/);
});

test('PostgREST update must return a real modified record, not false success on zero-row RLS denial',()=>{
  assert.match(edit,/\.select\('id'\)\s*\.maybeSingle\(\)/);
  assert.match(edit,/if \(!updatedBusiness\) throw new Error/);
  assert.ok(edit.indexOf('if (!updatedBusiness)')<edit.indexOf('setSuccess(true)'));
});

test('image uploads validate file types and sizes and unique object names',()=>{
  assert.match(edit,/image\/jpeg.*image\/png.*image\/webp/);
  assert.match(edit,/MAX_BUSINESS_IMAGE_BYTES = 5 \* 1024 \* 1024/);
  assert.equal((edit.match(/validateBusinessImage\(file\)/g)||[]).length,2);
  assert.equal((edit.match(/validateBusinessImage\((logo|hoverImage)\)/g)||[]).length,2);
  assert.equal((edit.match(/crypto\.randomUUID\(\)/g)||[]).length,2);
  assert.equal((edit.match(/\.upload\(filePath, (logo|hoverImage), \{ contentType:/g)||[]).length,2);
});

test('temporary new objects are cleaned after failure but not after successful DB update',()=>{
  assert.match(edit,/uploadedPaths\.push\(filePath\)/);
  assert.match(edit,/!savedToDatabase && uploadedPaths\.length/);
  assert.match(edit,/\.from\('business-logos'\)\.remove\(uploadedPaths\)/);
  assert.match(edit,/savedToDatabase = true;/);
});

test('saved object URLs persist in local state and files are cleared after successful update',()=>{
  assert.match(edit,/setSavedLogoUrl\(logoUrl\)/);
  assert.match(edit,/setSavedCoverUrl\(hoverImageUrl\)/);
  assert.match(edit,/setLogo\(null\)/);
  assert.match(edit,/setHoverImage\(null\)/);
  assert.match(edit,/setLogoPreview\(logoUrl\)/);
  assert.match(edit,/setHoverImagePreview\(hoverImageUrl\)/);
  assert.doesNotMatch(edit,/Date\.now\(\)_logo_/);
});
