import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getCampaignStarterIdeas,CAMPAIGN_HELP} from '../lib/marketing/campaign-starters.ts';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const nav=read('app/vendor/layout.tsx');
const planner=read('app/vendor/marketing/campaigns/page.tsx');

test('Gallery & Services appears directly in primary desktop and compact mobile navigation, not Tools',()=>{
 const primary=nav.slice(nav.indexOf('const primaryNav:'),nav.indexOf('const growthNav:'));
 const tools=nav.slice(nav.indexOf('const growthNav:'),nav.indexOf('const accountNav:'));
 assert.match(primary,/name:'Gallery & Services',href:'\/vendor\/gallery-services'/);
 assert.doesNotMatch(tools,/gallery-services/);
 assert.match(nav,/gallery-top-nav/);
 assert.match(nav,/gallery-compact-nav/);
 assert.equal((primary.match(/gallery-services/g)||[]).length,1);
});
test('Free Campaign Planner is editor-first with clean horizontal tabs and responsive wider live preview',()=>{
 assert.match(planner,/data-testid="campaign-planner-free"/);
 assert.match(planner,/useState<Section>\('social'\)/);
 assert.match(planner,/aria-label="Campaign sections"[^\n]*overflow-x-auto/);
 assert.match(planner,/lg:grid-cols-\[minmax\(0,1\.07fr\)_minmax\(320px,\.93fr\)\]/);
 assert.match(planner,/lg:sticky lg:top-4/);
 assert.match(planner,/aria-label=\{helper.readiness\}/);
 assert.match(planner,/readyCount\}\/3/);
 assert.doesNotMatch(planner,/lg:grid-cols-\[220px_minmax\(0,1fr\)\]/);
});
test('Free suggestions are opt-in and only on empty message; no AI or Pro charging',()=>{
 assert.match(planner,/!offer\.trim\(\)&&<div aria-label=\{helper.ideas\}/);
 assert.match(planner,/onClick=\{\(\)=>setOffer\(idea\)\}/);
 assert.match(planner,/getCampaignStarterIdeas\(language,objective\)/);
 assert.doesNotMatch(planner,/getMarketingAccessForUser|requirePro|growth_credits|autoPublish\(/);
 for(const lang of ['English','தமிழ்','සිංහල']){
   assert.ok(CAMPAIGN_HELP[lang].free.length>10);
   for(const goal of ['awareness','promotion','enquiries','announcement']){
     const ideas=getCampaignStarterIdeas(lang,goal);
     assert.equal(ideas.length,2);
     assert.notEqual(ideas[0],ideas[1]);
     for(const idea of ideas){
       assert.ok(idea.length>15&&idea.length<=240);
       assert.doesNotMatch(idea,/\d+\s*%|guaranteed|exclusive discount|free delivery/i);
     }
     if(lang==='தமிழ்')assert.match(ideas.join(''),/[\u0B80-\u0BFF]/u);
     if(lang==='සිංහල')assert.match(ideas.join(''),/[\u0D80-\u0DFF]/u);
   }
 }
});
test('Basic draft, edit, schedule, archive, copy and four exact PNG formats remain available',()=>{
 for(const token of ['const openCampaign=','const save=async(schedule:boolean)','const changeArchive=',
   'const exportBrandedCreative=','renderCampaignPoster({','CampaignFormatSelector',
   'copy.schedule','copy.exportPoster','copy.exportText','copy.noAuto','DRAFT — REVIEW BEFORE PUBLISHING']){
   assert.ok(planner.includes(token),token);
 }
});
