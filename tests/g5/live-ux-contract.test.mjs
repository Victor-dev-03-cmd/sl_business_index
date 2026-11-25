import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const leads=read('app/vendor/leads/page.tsx');
const reviews=read('app/vendor/reviews/page.tsx');
const settings=read('app/vendor/settings/page.tsx');
const leadiq=read('lib/growth/g5/lead-iq.ts');
const rep=read('lib/growth/g5/reputation-actions.ts');

test('G5 LeadIQ actually connects to EXISTING owner CRM, not mock page or paid engine',()=>{
  assert.match(leads,/data-g5-leadiq="true"/);
  assert.match(leads,/buildLeadIQQueue\(leads,followUps,followUpReadiness,now\)/);
  assert.match(leads,/leadIQQueue\.slice\(0,3\)/);
  assert.match(leads,/onClick=\{\(\)=>openLead\(item\.id\)\}/);
  assert.match(leads,/LeadIQ priority/);
  assert.match(leads,/followUpReadiness==='unavailable'/);
  assert.match(leads,/Saved reminder data is unavailable/);
  assert.match(leads,/\.eq\('owner_id', user\.id\)/);
  assert.match(leads,/\.in\('business_id', ownedRows\.map\(b => b\.id\)\)/);
  assert.match(leads,/leadLimitReached/);
  assert.match(leads,/No open enquiry requires prioritization/);
  assert.doesNotMatch(leads,/\/api\/g5|fetch\(\s*['"]https:\/\//);
});
test('G5 Reputation lives in published owner reviews; manual reply and pagination unchanged',()=>{
  assert.match(reviews,/data-g5-reputation="true"/);
  assert.match(reviews,/buildReputationQueue\(reviews\)/);
  assert.match(reviews,/reputationQueue\.slice\(0,3\)/);
  assert.match(reviews,/onClick=\{\(\)=>openReview\(item\.id\)\}/);
  assert.match(reviews,/Needs reply first/);
  assert.match(reviews,/reviewLimitReached/);
  assert.match(reviews,/\.eq\('owner_id', user\.id\)/);
  assert.match(reviews,/\.in\('business_id', rows\.map\(b => b\.id\)\)/);
  assert.match(reviews,/\.eq\('is_approved', true\)/);
  assert.match(reviews,/\.insert\(\{ review_id: current\.id, vendor_id: user\.id, reply_text: text \}\)/);
  assert.match(reviews,/No AI sentiment inference/);
});
test('G5 calculation is bounded and only from existing CRM stage/due or published rating/reply',()=>{
  assert.match(leadiq,/LeadIQ — bounded, deterministic/);
  assert.match(leadiq,/followUpReadiness==='available'/);
  assert.match(leadiq,/followup\.done_at/);
  assert.match(leadiq,/lead\.status==='new'/);
  assert.match(leadiq,/lead\.status==='converted'/);
  assert.match(rep,/review\.review_replies\?\.length/);
  assert.match(rep,/value<=2/);
  for(const code of [leadiq,rep]){
    assert.doesNotMatch(code,/\bfetch\(|\.from\(|\/api\/|\.update\(|\.insert\(/);
  }
});
test('Settings Account Profile name and business are separately aligned, not an impersonating badge',()=>{
  assert.match(settings,/data-testid="settings-profile-summary"/);
  assert.match(settings,/grid-cols-\[44px_minmax\(0,1fr\)\]/);
  assert.match(settings,/sm:grid-cols-\[56px_minmax\(0,1fr\)_auto\]/);
  assert.match(settings,/Account name/);
  assert.match(settings,/\{profile\.full_name\|\|'Complete your profile'\}/);
  assert.match(settings,/Business: \{selected\.name\}/);
  assert.match(settings,/max-w-full truncate/);
  assert.match(settings,/vendor-status-badge col-span-2 justify-self-start/);
  assert.doesNotMatch(settings,/\[&_div:nth-child\(2\)\]/);
});
test('Settings SEO keyword editor is a real styled full-width accessible input and Add submits',()=>{
  assert.match(settings,/data-testid="vendor-seo-keyword-editor"/);
  assert.match(settings,/aria-describedby="seo-keyword-help"/);
  assert.match(settings,/sm:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(settings,/border-2 border-\[#D4D8E2\] bg-white/);
  assert.match(settings,/focus:border-\[#FF7900\]/);
  assert.match(settings,/onSubmit=\{event=>\{event\.preventDefault\(\);addKeyword\(\);\}\}/);
  assert.match(settings,/type="submit" disabled=\{!selectedBusinessId\|\|!newKeyword\.trim\(\)\|\|keywords\.length>=10\}/);
  assert.match(settings,/Up to 10 terms/);
  assert.match(settings,/Save discovery settings/);
  assert.match(settings,/max-w-\[220px\] truncate/);
});
