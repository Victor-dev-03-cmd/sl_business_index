import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewCampaignCaption} from '../lib/marketing/campaign-readiness.ts';
import {SHARE_CAPTION_MAX_LENGTH,SHARE_CAPTION_MAX_TITLE} from '../lib/marketing/campaign-manual-share.ts';
import {WORDS} from '../lib/marketing/campaign-language.ts';

const normal={businessName:'Jaffna Bakery',message:'Fresh bread',cta:'Call for details',terms:'',objective:'awareness',preview:'Fresh bread\nCall for details'};
test('plain text client-only review is advisory and cannot publish',()=>{
  const review=reviewCampaignCaption(normal);
  assert.equal(review.canShare,true);
  assert.equal(review.hasMessage,true);
  assert.equal(review.hasCta,true);
  assert.equal(review.needsTermsReview,false);
  assert.equal(review.characters,normal.preview.length);
});
test('missing message warns but retains G1-08 CTA-only manual share',()=>{
  const review=reviewCampaignCaption({...normal,message:'   ',cta:'Call now'});
  assert.equal(review.hasMessage,false);
  assert.equal(review.canShare,true);
  assert.equal(review.hasCta,true);
});
test('promotion without terms is a suggestion, not a legal requirement or blocking gate',()=>{
  const review=reviewCampaignCaption({...normal,objective:'promotion',terms:'  '});
  assert.equal(review.needsTermsReview,true);
  assert.equal(review.canShare,true);
  assert.equal(reviewCampaignCaption({...normal,objective:'promotion',terms:'Ends Friday'}).needsTermsReview,false);
});
test('strict manual-share capacity matches existing G1-08 input validation',()=>{
  assert.equal(reviewCampaignCaption({...normal,preview:'a'.repeat(SHARE_CAPTION_MAX_LENGTH)}).canShare,true);
  const tooLong=reviewCampaignCaption({...normal,preview:'a'.repeat(SHARE_CAPTION_MAX_LENGTH+1)});
  assert.equal(tooLong.exceedsShareLimit,true);
  assert.equal(tooLong.canShare,false);
  assert.equal(reviewCampaignCaption({...normal,businessName:'a'.repeat(SHARE_CAPTION_MAX_TITLE+1)}).canShare,false);
  assert.equal(reviewCampaignCaption({...normal,businessName:'  '}).canShare,false);
  assert.equal(reviewCampaignCaption({...normal,message:' ',cta:' '}).canShare,false);
});
test('Tamil Sinhala and emoji character reporting does not split surrogate pairs',()=>{
  const s='தமிழ் සිංහල 😀';
  const review=reviewCampaignCaption({...normal,preview:s});
  assert.equal(review.characters,Array.from(s).length);
  assert.equal(review.canShare,true);
});
test('all three languages have complete review guidance and live preview is non-mutating',()=>{
  const keys=['captionReviewTitle','captionReviewHelp','captionCharacters','reviewBusiness','reviewMessage','reviewCta','reviewTerms','reviewTooLong','reviewLongName','reviewChooseBusiness','reviewWriteMessage','reviewConsiderCta','reviewConsiderTerms','reviewReady'];
  for(const l of ['English','தமிழ்','සිංහල'])for(const key of keys)assert.ok(WORDS[l][key].length>3,l+' '+key);
  const page=readFileSync(new URL('../app/vendor/marketing/campaigns/page.tsx',import.meta.url),'utf8');
  assert.match(page,/data-testid="planner-caption-review"/);
  assert.match(page,/data-testid="planner-caption-characters"/);
  assert.match(page,/disabled=\{!captionReview\.canShare\}/);
  for(const keep of ['const save=async(schedule:boolean)','CampaignFormatSelector','G1PlannerFacts','shareCampaignCaption','copy.exportPoster','copy.exportText','copy.copy'])assert.ok(page.includes(keep),keep);
  const helper=readFileSync(new URL('../lib/marketing/campaign-readiness.ts',import.meta.url),'utf8');
  assert.doesNotMatch(helper,/fetch\(|supabase|insert\(|update\(|postMessage\(|publish\(/i);
});
