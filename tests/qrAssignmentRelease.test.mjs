import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const load=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const api=load('app/api/qr/request/route.ts');
const studio=load('app/vendor/qr-code/page.tsx');
const redirect=load('app/q/[id]/page.tsx');

test('vendor QR assignment route requires same-origin and verified user',()=>{
  assert.match(api,/isSameOrigin\(request\.url,request\.headers\.get\('origin'\)\)/);
  assert.match(api,/supabase\.auth\.getUser\(\)/);
  assert.match(api,/\.eq\('owner_id',user\.id\)/);
  assert.match(api,/business\.status!=='approved'/);
  assert.match(api,/randomBytes\(12\)/);
  assert.match(api,/qr_inventory/);
  assert.match(api,/status:'assigned'/);
  assert.match(api,/existing:true/);
  assert.doesNotMatch(api,/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|createAdminClient/);
});

test('QR Studio uses one latest assigned QR and creates via real endpoint',()=>{
  assert.match(studio,/fetch\('\/api\/qr\/request'/);
  assert.match(studio,/\.eq\('status','assigned'\)\.order\('created_at'/);
  assert.match(studio,/\.limit\(1\)\.maybeSingle\(\)/);
  assert.match(studio,/setAssigned\(result\.qr\)/);
  assert.match(redirect,/\.eq\("serial_id", id\)/);
  assert.match(redirect,/qr\.status === "assigned"/);
});
