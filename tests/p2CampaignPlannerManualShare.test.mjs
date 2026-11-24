import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shareCampaignCaption} from '../lib/marketing/campaign-manual-share.ts';
import {WORDS} from '../lib/marketing/campaign-language.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('app/vendor/marketing/campaigns/page.tsx');

test('native share invokes immediately within user click, caption + title only',async()=>{
 const calls=[];
 const task=shareCampaignCaption({title:'  Business  ',text:'  தமிழ் செய்தி  '},
   {share:async content=>{calls.push(content);}});
 assert.deepEqual(calls,[{title:'Business',text:'தமிழ் செய்தி'}]);
 assert.equal(await task,'sheet_closed');
});
test('desktop unsupported native share copies caption exactly once',async()=>{
 const copied=[];
 const result=await shareCampaignCaption({title:'Owner',text:'  New promotion  '},
   {copy:async text=>{copied.push(text);}});
 assert.equal(result,'copied');
 assert.deepEqual(copied,['New promotion']);
});
test('canceling native OS share never copies or claims posted',async()=>{
 let copies=0;
 const out=await shareCampaignCaption({title:'A',text:'B'},{
   share:async()=>{throw Object.assign(new Error('cancel'),{name:'AbortError'});},
   copy:async()=>{copies++;},
 });
 assert.equal(out,'canceled');assert.equal(copies,0);
});
test('native share failure never retries via clipboard and failures are distinguished',async()=>{
 let copies=0;
 const out=await shareCampaignCaption({title:'A',text:'B'},{
   share:async()=>{throw new Error('permission denied');},
   copy:async()=>{copies++;},
 });
 assert.equal(out,'failed');assert.equal(copies,0);
 assert.equal(await shareCampaignCaption({title:'A',text:'B'},{}),'unavailable');
});
test('empty or oversized caption/title never causes a share side effect',async()=>{
 let actions=0;
 const ports={share:async()=>{actions++;},copy:async()=>{actions++;}};
 for(const input of [{title:'',text:'valid'},{title:'A',text:' '},
   {title:'A'.repeat(151),text:'B'},{title:'A',text:'B'.repeat(3001)}]){
   assert.equal(await shareCampaignCaption(input,ports),'unavailable');
 }
 assert.equal(actions,0);
});
test('all three languages have sharing hints, accessible button is click-only',()=>{
 for(const l of ['English','தமிழ்','සිංහල']){
   for(const key of ['shareCaption','shareExplain','shareCopied','shareSheetClosed','shareFailed','shareUnavailable']){
     assert.ok(WORDS[l][key].length>10,l+' '+key);
   }
 }
 assert.match(page,/data-testid="planner-manual-share-caption"/);
 assert.match(page,/onClick=\{\(\)=>void manualShareCaption\(\)\}/);
 assert.match(page,/navigator\.share==='function'/);
 assert.match(page,/copy\.shareExplain/);
 assert.match(page,/outcome==='canceled'|AbortError from the user canceling/);
});
test('Free planner saves/edits/exports and prior G1 service hints remain intact',()=>{
 for(const x of ['const save=async(schedule:boolean)','const exportBrandedCreative=',
   'CampaignFormatSelector','copy.exportPoster','copy.exportText','copy.copy',
   'G1PlannerFacts','getCampaignStarterIdeas']){
   assert.ok(page.includes(x),x);
 }
 assert.doesNotMatch(page,/autoPublish\(|NEXT_PUBLIC_SUPABASE_SECRET|growth_credits/);
});
