import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const api=read('app/api/vendor/g1-knowledge/route.ts');
const knowledge=read('app/vendor/components/G1BusinessKnowledgePanel.tsx');
const my=read('app/vendor/my-businesses/page.tsx');
const gallery=read('app/vendor/gallery-services/GalleryServicesWorkspace.tsx');
const marketing=read('app/vendor/marketing/page.tsx');
test('G1 route is live read-only, SSR user RLS and owner-bound; never admin DB',()=>{
  assert.match(api,/export async function GET/);
  assert.match(api,/createClient\(\)/);
  assert.match(api,/createG1IsolatedSSRReadPort/);
  assert.match(api,/resolveG1ReadOnlyKnowledge/);
  assert.match(api,/private, no-store/);
  assert.match(api,/Vary':\s*'Cookie'/);
  assert.doesNotMatch(api,/export async function (POST|PUT|PATCH|DELETE)|createAdminClient|service_role|SUPABASE_SERVICE_ROLE|SUPABASE_SECRET_KEY|\.insert\(|\.upsert\(|\.update\(/);
});
test('three actual user-facing pages render shared live G1 knowledge with approved-only selector',()=>{
 for (const [content,location] of [[my,'business'],[gallery,'gallery'],[marketing,'marketing']]){
    assert.match(content,/G1BusinessKnowledgePanel/);
    assert.match(content,new RegExp('location="'+location+'"'));
 }
 assert.match(marketing,/select\('id,name,status'\)\.eq\('owner_id',user\.id\)/);
 assert.match(knowledge,/businesses\.filter\(b=>b\.status==='approved'\)/);
 assert.match(knowledge,/credentials:'same-origin'/);
 assert.match(knowledge,/cache:'no-store'/);
 assert.match(knowledge,/data\.services\.value/);
 assert.match(knowledge,/data\.galleryImageCount\.value/);
 assert.match(knowledge,/Refresh/);
 assert.match(knowledge,/nothing is automatically sent to an AI or published/i);
});
test('read-only G1 API is only a narrow approved owner-bound query',()=>{
 const resolver=read('lib/growth/g1/knowledge-resolver-contract.ts');
 const adapter=read('lib/growth/g1/isolated-ssr-read-adapter.ts');
 assert.match(adapter,/auth\.getUser\(\)/);
 assert.match(adapter,/\.eq\("owner_id", query\.ownerId\)/);
 assert.match(adapter,/\.eq\("status", "approved"\)/);
 assert.match(resolver,/business\.owner_id !== requesterUserId/);
 assert.match(resolver,/business\.status !== "approved"/);
 assert.doesNotMatch(api,/getSession|\.select\('\*'\)/);
});
