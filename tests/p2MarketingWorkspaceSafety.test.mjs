import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preparePlannerCaption,captionRequestIdentity,serializeEditedCaption,isCurrentPosterOutput,inferPosterFormat} from '../lib/marketing/workspace-safety.ts';
import {plannerBriefFromCaption} from '../lib/marketing/caption-planner-brief.ts';
import {parseGeminiCaptionOutput} from '../lib/marketing/caption-gemini-output.ts';
import {parseThreeAngles} from '../lib/marketing/caption-workspace.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('oversized combined copy is rejected without truncation; valid copy is unchanged',()=>{
 const long='தமிழ் '.repeat(500)+'සිංහල '.repeat(300)+'English '.repeat(200);
 assert.equal(preparePlannerCaption(long,[],false).ok,false);
 assert.deepEqual(preparePlannerCaption('தமிழ்\nසිංහල\nEnglish',['#SLBI'],true),{ok:true,text:'தமிழ்\nසිංහල\nEnglish\n\n#SLBI'});
});
test('retry identity stable across retries and distinct for language/changed brief',async()=>{
 const a=await captionRequestIdentity('business-A|offer','ta');
 assert.equal(a,await captionRequestIdentity('business-A|offer','ta'));
 assert.notEqual(a,await captionRequestIdentity('business-A|offer','si'));
 assert.notEqual(a,await captionRequestIdentity('business-A|edited','ta'));
 const ui=read('app/vendor/marketing/captions/page.tsx');
 const api=read('app/api/marketing/caption/route.ts');
 assert.match(ui,/sessionStorage.getItem\(identity\)/);
 assert.match(ui,/if\(data.refundConfirmed===true\|\|data.code==='CAPTION_REQUEST_REFUNDED'\)forget\(\)/);
 assert.match(api,/refundConfirmed=!refundError&&refunded===true/);
});
test('poster export requires matching completed revision plus generation input',()=>{
 const ready={hasBlob:true,stage:'ready',generating:false,composing:false,artworkKey:'a',creativeKey:'a',completedRenderKey:'r',renderKey:'r',copyLanguageConsistent:true,serviceFocusApproved:true};
 assert.equal(isCurrentPosterOutput(ready),true);
 for(const patch of [{stage:'error'},{composing:true},{generating:true},{creativeKey:'b'},{renderKey:'new'},{serviceFocusApproved:false},{copyLanguageConsistent:false},{artworkKey:''},{hasBlob:false}])assert.equal(isCurrentPosterOutput({...ready,...patch}),false);
});
test('edited drafts roundtrip without silently losing angles',()=>{
 const angles={hook:'Review our verified services.',story:'Our team can help explain the offer.',short:'Contact us today.'};
 const saved=serializeEditedCaption(angles,['#SLBI']);
 assert.equal(saved.ok,true);
 assert.deepEqual(parseThreeAngles(saved.text),angles);
 assert.equal(serializeEditedCaption({...angles,hook:'x'.repeat(901)},[]).ok,false);
});
test('Planner keeps original known export format and its seven-key contract',()=>{
 for(const format of ['story','square','landscape','portrait']){
  const brief=plannerBriefFromCaption({caption:'Example',cta:'',terms:'',language:'en',objective:'promotion',format,palette:'cream'});
  assert.equal(brief.format,format);assert.equal(brief.palette,'cream');assert.equal(Object.keys(brief).length,7);
 }
});
test('token native-script character no longer passes as Tamil or Sinhala',()=>{
 const tags=['#SriLanka','#Business','#Shop','#Offer','#Local','#Service'];
 const mk=(lang,ch)=>JSON.stringify({variations:{[lang]:{hook:'English marketing text only '+ch,story:'English business story only '+ch,short:'English caption only '+ch}},hashtags:tags});
 assert.equal(parseGeminiCaptionOutput(mk('Tamil','த'),'ta'),null);
 assert.equal(parseGeminiCaptionOutput(mk('Sinhala','ක'),'si'),null);
});
test('save and generation share operation lock; no automatic repeat billable action',()=>{
 const ui=read('app/vendor/marketing/captions/page.tsx');
 assert.match(ui,/disabled=\{!currentCaption.trim\(\)\|\|isBusy\}/);
 assert.match(ui,/const savePlanner=async\(\)=>\{\s*if\(isBusy\|\|operationRef.current/);
 assert.match(ui,/const generate=async\(retryFailedOnly=false\)=>\{\s*if\(isBusy\|\|operationRef.current/);
 const poster=read('app/vendor/marketing/design/puter-lab/page.tsx');
 assert.match(poster,/autoSavedRevisionRef.current===imageRevision/);
 assert.match(poster,/disabled=\{!outputReady\|\|locked\}/);
 const storage=read('app/api/marketing/poster/saved/route.ts');
 assert.match(storage,/createHash\('sha256'\).update\(prefix\)/);
 assert.match(storage,/upsert:false/);
});

test('PNG headers preserve actual known export aspect ratio without guessing unknown ratios',async()=>{
 const png=(w,h)=>{const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);const view=new DataView(bytes.buffer);view.setUint32(16,w);view.setUint32(20,h);return new Blob([bytes],{type:'image/png'});};
 for(const [w,h,format] of [[1080,1920,'story'],[1080,1350,'portrait'],[1080,1080,'square'],[1200,630,'landscape'],[1200,800,'uploaded']])assert.equal(await inferPosterFormat(png(w,h)),format);
});
