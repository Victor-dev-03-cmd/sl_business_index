import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {plannerBriefFromCaption} from '../lib/marketing/caption-planner-brief.ts';
import {normalizedSriLankaPhone,unverifiedCtaPhone} from '../lib/marketing/caption-cta-phone.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('app/vendor/marketing/captions/page.tsx');
const poster=read('app/vendor/marketing/design/puter-lab/page.tsx');
const planner=read('app/vendor/marketing/campaigns/page.tsx');
const plannerImage=read('app/vendor/marketing/campaigns/LinkedCaptionPoster.tsx');
const route=read('app/api/marketing/poster/saved/route.ts');
const captionApi=read('app/api/marketing/caption/route.ts');
const client=read('lib/marketing/saved-poster-cloud-client.ts');
const migration=read('supabase/migrations/20261117210000_p2_caption_planner_private_poster_asset_ref.sql');

test('Campaign Planner brief includes EXACTLY seven CHECK-allowed strings and preserves data bounds',()=>{
  const all=[
    {language:'ta',objective:'promotion'},
    {language:'si',objective:'announcement'},
    {language:'en',objective:'awareness'},
  ];
  const langs=['தமிழ்','සිංහල','English'];
  for(let i=0;i<all.length;i++){
    const record=all[i];
    const input={caption:'சலுகை '.repeat(150),cta:'Contact us '.repeat(30),
      terms:'Terms '.repeat(100),language:record.language,objective:record.objective};
    const brief=plannerBriefFromCaption(input);
    assert.deepEqual(Object.keys(brief).sort(),
      ['offer','cta','terms','language','objective','format','palette'].sort());
    assert.equal(brief.language,langs[i]);
    assert.equal(brief.objective,record.objective);
    assert.equal(brief.format,'portrait');assert.equal(brief.palette,'navy');
    assert.ok(brief.offer.length<=240&&brief.cta.length<=130&&brief.terms.length<=220);
  }
  assert.match(page,/const brief=plannerBriefFromCaption\(/);
  assert.match(page,/banner_text:combined/);
  assert.doesNotMatch(page,/captionBundle:captions/);
  assert.doesNotMatch(page,/posterLocalKey:hasLinked\?posterKey:null/);
  assert.match(page,/poster_asset_id:posterAssetId\|\|null/);
  assert.match(migration,/ADD COLUMN IF NOT EXISTS poster_asset_id uuid/);
  assert.doesNotMatch(migration,/DROP CONSTRAINT|DISABLE ROW LEVEL SECURITY|DROP POLICY/);
});

test('Owner CTA phone accepts verified local/international formats and disallows mismatches',()=>{
  assert.equal(normalizedSriLankaPhone('+94 76 920 0572'),'0769200572');
  assert.equal(normalizedSriLankaPhone('0769200572'),'0769200572');
  assert.equal(unverifiedCtaPhone('Contact us today on 0769200572','0769200572'),false);
  assert.equal(unverifiedCtaPhone('Call +94 76 920 0572','0769200572'),false);
  assert.equal(unverifiedCtaPhone('Call 0769200573','0769200572'),true);
  assert.equal(unverifiedCtaPhone('Call 0769200572',''),true);
  assert.equal(unverifiedCtaPhone('Deepavali offer: 15%',''),false);
  assert.equal(unverifiedCtaPhone('Contact me',''),false);
  const check=captionApi.indexOf("if(unverifiedCtaPhone(brief.cta,business.phone||''))");
  const reserve=captionApi.indexOf("admin.rpc('marketing_reserve_ai_draft'");
  assert.ok(check>0&&reserve>check,'CTA phone validation BEFORE growth credits reservation');
  assert.match(captionApi,/CTA_PHONE_NOT_VERIFIED/);
  assert.match(captionApi,/verifiedPhone:business.phone\|\|''/);
  const prompt=read('lib/marketing/caption-contract.ts');
  assert.match(prompt,/preserve that EXACT verified phone/);
  assert.match(prompt,/verifiedPhone:limit\(ctx.verifiedPhone\|\|''/);
  assert.match(captionApi,/GEMINI_CAPTION_INVALID/);
  assert.match(captionApi,/marketing_refund_ai_draft/);
});

test('Save Poster uses server-owned PRIVATE PNG bucket with per-user+business paths',()=>{
  assert.match(route,/const BUCKET='slbi-poster-ai-private'/);
  assert.match(route,/const path=\(uid:string,bid:string,assetId:string\)=>/);
  assert.match(route,/'saved\/'\+uid\+'\/'\+bid\+'\/'\+assetId\+'\.png'/);
  assert.match(route,/client\.auth\.getUser\(\)/);
  assert.match(route,/isPosterInternalQAAccount\(user.id,client\)/);
  assert.match(route,/\.eq\('id',businessId\)\.eq\('owner_id',user.id\)/);
  assert.match(route,/isSameOrigin\(request\.url,request\.headers\.get\('origin'\)\)/);
  assert.match(route,/MAX_IMAGE_BYTES=12_000_000/);
  assert.match(route,/PNG_MAGIC\.every/);
  assert.match(route,/MAX_SAVED_PER_BUSINESS=50/);
  assert.match(route,/upsert:false/);
  assert.match(route,/Content-Disposition/);
  assert.match(route,/Cache-Control':'private, no-store/);
  assert.match(route,/UUID\.test\(assetId\)/);
  assert.match(route,/admin\.storage\.from\(BUCKET\)/);
  assert.doesNotMatch(route,/getPublicUrl|createSignedUrl|public:true|upsert:true/);
  assert.doesNotMatch(client,/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
  assert.match(client,/credentials:'same-origin'/);
  assert.match(client,/readSavedPoster/);
  assert.match(client,/uploadSavedPoster/);
  assert.match(client,/deleteSavedPoster/);
  assert.match(route,/export async function DELETE\(request:Request\)/);
  assert.match(route,/\.eq\('poster_asset_id',assetId\)/);
  assert.match(route,/\.remove\(\[path\(ctx\.uid!,businessId,assetId\)\]\)/);
});

test('Two studios can save/reopen images and Planner displays owned permanent PNG',()=>{
  assert.match(poster,/const savePosterBlob=useCallback\(/);
  assert.match(poster,/savePosterBlob\(blob,businessId\)/);
  assert.match(poster,/Auto-saved to your private poster library/);
  assert.match(poster,/onClick=\{\(\)=>void deletePoster\(asset\)\}/);
  assert.doesNotMatch(poster,/savePosterToCloud/);
  assert.match(poster,/Saved \(\{savedAssets.length\}\)/);
  assert.match(poster,/Private Saved Posters/);
  assert.match(poster,/privatePosterUrl\(businessId,asset.id\)/);
  assert.match(page,/const saveCaptionImage=async\(\)=>/);
  assert.match(page,/const selectCloudPoster=async\(asset:SavedPosterAsset\)=>/);
  assert.match(page,/listSavedPosters\(businessId\)/);
  assert.match(page,/readSavedPoster\(businessId,asset.id\)/);
  assert.match(page,/onClick=\{\(\)=>void saveCaptionImage\(\)\}/);
  assert.match(page,/Private saved posters · available on your signed-in devices/);
  assert.match(page,/posterAssetId=await uploadSavedPoster\(businessId,linked.image\)/);
  assert.match(planner,/poster_asset_id/);
  assert.match(planner,/LinkedCaptionPoster localKey=\{c.brief\?\.posterLocalKey\}/);
  assert.match(plannerImage,/privatePosterUrl\(businessId,assetId\)/);
  assert.match(plannerImage,/Download saved PNG/);
  assert.match(planner,/c.banner_color==='caption-lab-connected-v1'/);
});

test('Provider failure maintains quota/refund boundary; no extra Gemini or image calls from saving',()=>{
  const save=page.slice(page.indexOf('  const savePlanner=async()=>{'),page.indexOf('  const pickPoster=async()=>{'));
  assert.match(save,/uploadSavedPoster/);
  assert.doesNotMatch(save,/\/api\/marketing\/caption|puter\.ai\.txt2img|marketing_reserve_ai_draft/);
  const studioSave=poster.slice(poster.indexOf('  // Final artwork, including'),
    poster.indexOf('  // Dual execution:'));
  assert.match(studioSave,/uploadSavedPoster|savePosterBlob/);
  assert.doesNotMatch(studioSave,/puter\.ai\.txt2img|api\/marketing\/caption/);
  assert.match(captionApi,/marketing_complete_ai_draft/);
  assert.match(captionApi,/marketing_refund_ai_draft/);
  assert.match(captionApi,/code:failureKind==='provider'/);
});

test('Owner-only planner grants and automatic image persistence cannot bypass RLS',()=>{
  const grants=read('supabase/migrations/20261118003000_p2_campaign_asset_insert_column_grant.sql');
  assert.match(grants,/GRANT INSERT \(poster_asset_id\) ON TABLE public\.marketing_campaigns TO authenticated/);
  assert.doesNotMatch(grants,/GRANT ALL|DISABLE ROW LEVEL SECURITY|TO anon;/i);
  assert.match(poster,/generationStage!=='ready'/);
  assert.match(poster,/!copyLanguageConsistent\|\|!serviceFocusApproved/);
  assert.match(poster,/savedPosterAssetId:backedUpId\|\|undefined/);
  assert.match(page,/setCloudAssetId\(record.context.savedPosterAssetId\|\|''\)/);
  assert.match(page,/\.update\(editablePatch\)/);
  assert.match(route,/if\(linked\?\.length\)return json\(409/);
  assert.doesNotMatch(route,/public:true|getPublicUrl|createSignedUrl/);
});
