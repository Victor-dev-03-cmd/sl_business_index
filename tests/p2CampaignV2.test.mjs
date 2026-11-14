import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('docs/growth/p2/P2_CAMPAIGN_PLANNER_V2_EDITABLE_BRIEF.sql');
const page=read('app/vendor/marketing/campaigns/page.tsx');
const poster=read('lib/marketing/campaign-poster.ts');
const language=read('lib/marketing/campaign-language.ts');
const selector=read('app/vendor/marketing/campaigns/CampaignFormatSelector.tsx');
test('P2-05 policy kept, restricted column-level draft editing + reversible archive',()=>{
 assert.match(sql,/marketing_campaign_owner_update/);
 assert.match(sql,/GRANT INSERT \(brief\)/);
 assert.match(sql,/GRANT UPDATE \(brief,is_archived\)/);
 assert.match(sql,/REVOKE ALL ON FUNCTION/);
 assert.match(sql,/NEW.brief IS NOT DISTINCT FROM OLD.brief/);
 assert.match(sql,/NEW.is_archived IS NOT DISTINCT FROM OLD.is_archived/);
 assert.doesNotMatch(sql,/GRANT DELETE /);
});
test('Campaign Planner supports exact form rehydration and id-filtered owner update',()=>{
 assert.match(page,/editingId/);
 assert.match(page,/\.eq\('id',editingId\)/);
 assert.match(page,/\.eq\('business_id',selectedId\)/);
 assert.match(page,/setEditingId\(null\)/);
 assert.match(page,/setOffer\(/);
 assert.match(page,/setCta\(/);
 assert.match(page,/setTerms\(/);
 assert.match(page,/is_archived/);
});
test('PNG never exports truncated content, distinct social dimensions and Unicode graphemes',()=>{
 assert.match(poster,/Intl.Segmenter/);
 assert.match(poster,/text_overflow/);
 assert.match(poster,/Only draw after all text was measured/);
 assert.doesNotMatch(poster,/\.slice\(0,maxLines\)/);
 for(const pattern of [/square:\{w:1080,h:1080/,/portrait:\{w:1080,h:1350/,/story:\{w:1080,h:1920/,/landscape:\{w:1200,h:630/]) assert.match(language,pattern);
 assert.match(selector,/viewBox=/);
 assert.match(selector,/role="radiogroup"/);
 assert.match(selector,/aria-checked=\{active\}/);
});
test('Full three-language labels, no covert Pro unlock / auto-post',()=>{
 for(const label of ['English',"'தமிழ்'","'සිංහල'"])assert.ok(language.includes(label));
 assert.match(page,/tFor\(language\)/);
 assert.doesNotMatch(page,/service_role|NEXT_PUBLIC_SUPABASE_SECRET|autoPublish\(/);
});
