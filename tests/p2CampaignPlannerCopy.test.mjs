import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {copyCampaignCaption} from '../lib/marketing/campaign-copy.ts';
const page=readFileSync(new URL('../app/vendor/marketing/campaigns/page.tsx',import.meta.url),'utf8');

test('Tamil Sinhala and English caption bytes preserved in explicit copy',async()=>{
 for(const text of ['வணக்கம்\nசலுகை','ආයුබෝවන්\nදීමනාව','Offer\nCall us']) {
  const calls=[];
  assert.equal(await copyCampaignCaption(text,async s=>{calls.push(s);}), 'copied');
  assert.deepEqual(calls,[text]);
 }
});
test('unsupported, invalid and too long content safely refuse without side effects',async()=>{
 let called=0;
 for(const value of ['', '  ', 'x'.repeat(3001)]){
  assert.equal(await copyCampaignCaption(value,async()=>{called++;}),'unavailable');
 }
 assert.equal(await copyCampaignCaption('valid'),'unavailable');
 assert.equal(called,0);
});
test('clipboard permission denial returns failed without throwing or posting',async()=>{
 assert.equal(await copyCampaignCaption('Offer',async()=>{throw new Error('NotAllowedError');}),'failed');
});
test('page uses guarded explicit copy for preview and library without automatic publish',()=>{
 assert.match(page,/data-testid="planner-copy-caption"/);
 assert.match(page,/data-testid="planner-library-copy-caption"/);
 assert.match(page,/navigator\.clipboard\?\.writeText/);
 assert.match(page,/onClick=\{\(\)=>void copyCaption\(preview\)\}/);
 assert.match(page,/onClick=\{\(\)=>void copyCaption\(c\.banner_text\)\}/);
 assert.match(page,/disabled=\{!business\|\|\(!offer\.trim\(\)&&!cta\.trim\(\)\)\}/);
 for(const token of ['const save=async(schedule:boolean)','exportBrandedCreative','shareCampaignCaption','G1PlannerFacts','CampaignFormatSelector'])assert.ok(page.includes(token),token);
 assert.doesNotMatch(page,/autoPublish\(/);
});
