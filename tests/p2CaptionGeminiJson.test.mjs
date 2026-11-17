import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  CAPTION_OUTPUT_LANGUAGE,captionGeminiResponseSchema,
  parseGeminiCaptionOutput,serializeGeminiCaptionOutput,
} from '../lib/marketing/caption-gemini-output.ts';
import {
  extractSavedCaptionHashtags,parseThreeAngles,hashtagsFrom,
} from '../lib/marketing/caption-workspace.ts';
import {buildCaptionMessages,validateCaptionInput} from '../lib/marketing/caption-contract.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const tags=['#SriLanka','#Jaffna','#LocalBusiness','#SmallBusiness','#Marketing','#SriLankanShops','#ShopLocal'];
const base={
  hook:'புதிய பொருட்களைத் தேடுகிறீர்களா? எங்கள் கடையில் தேர்வுகள் உள்ளன!',
  story:'எங்கள் கடையில் கிடைக்கும் பொருட்களைப் பற்றி மேலும் அறிந்துகொள்ளுங்கள். தேவைக்கு ஏற்றதைத் தேர்வு செய்ய உதவுகிறோம்.',
  short:'இன்று புதிய தேர்வுகளைப் பாருங்கள்!\nவிவரங்களுக்கு எங்களைத் தொடர்புகொள்ளுங்கள்.',
};
const tamil={variations:{Tamil:base},hashtags:tags};
const sinhala={variations:{Sinhala:{
  hook:'ඔබේ අවශ්‍යතාවයට ගැලපෙන නිෂ්පාදන සොයනවාද? අපෙන් විමසන්න!',
  story:'අපගේ වෙළඳසැලේ ඇති නිෂ්පාදන ගැන විස්තර දැනගන්න. ඔබට ගැලපෙන දේ තෝරාගැනීමට අපි උදව් කරමු.',
  short:'අලුත් තේරීම් බලන්න!\nවැඩි විස්තර සඳහා අප අමතන්න.',
}},hashtags:tags};
const english={variations:{English:{
  hook:'Looking for new arrivals? Explore what our store has to offer today.',
  story:'Discover products at our local store. We can help you find the option that fits your needs.',
  short:'New arrivals to explore!\nMessage our store for details.',
}},hashtags:tags};

test('Gemini JSON schema exposes precisely one requested language and 6–8 hashtags',()=>{
  for(const language of ['ta','si','en']){
    const s=captionGeminiResponseSchema(language);
    assert.equal(s.type,'object');
    assert.deepEqual(s.required,['variations','hashtags']);
    assert.deepEqual(Object.keys(s.properties.variations.properties),[CAPTION_OUTPUT_LANGUAGE[language]]);
    assert.deepEqual(s.properties.variations.properties[CAPTION_OUTPUT_LANGUAGE[language]].required,
      ['hook','story','short']);
    assert.equal(s.properties.hashtags.minItems,6);
    assert.equal(s.properties.hashtags.maxItems,8);
  }
});

test('Gemini correctly parses all three Sri Lankan languages with 3 angles and keeps 7 tags',()=>{
  for(const [language,example] of [['ta',tamil],['si',sinhala],['en',english]]){
    const parsed=parseGeminiCaptionOutput(JSON.stringify(example),language,'Jaffna');
    assert.ok(parsed,'Language '+language);
    assert.deepEqual(parsed.hashtags,tags);
    const draft=serializeGeminiCaptionOutput(parsed,language);
    assert.ok(draft&&draft.length<=3000);
    assert.deepEqual(parseThreeAngles(draft),
      example.variations[CAPTION_OUTPUT_LANGUAGE[language]]);
    assert.deepEqual(extractSavedCaptionHashtags(draft),tags);
    assert.deepEqual(hashtagsFrom(extractSavedCaptionHashtags(draft).join(' ')),tags);
    assert.doesNotMatch(parseThreeAngles(draft).short,/\[\[HASHTAGS\]\]/);
  }
});

test('Legacy drafts still work, while malformed model JSON fails closed',()=>{
  const old='[[HOOK]] Legacy hook.\n[[STORY]] Legacy story.\n[[SHORT]] Legacy short.';
  assert.deepEqual(parseThreeAngles(old),{hook:'Legacy hook.',story:'Legacy story.',short:'Legacy short.'});
  assert.deepEqual(extractSavedCaptionHashtags(old),[]);
  assert.equal(parseGeminiCaptionOutput(JSON.stringify(tamil),'ta','Colombo'),null);
  assert.equal(parseGeminiCaptionOutput(JSON.stringify(tamil),'ta'),null);
  for(const broken of [
    'prefix'+JSON.stringify(tamil),
    JSON.stringify({...tamil,tracking:'untrusted'}),
    JSON.stringify({variations:tamil.variations}),
    JSON.stringify({...tamil,hashtags:tags.slice(0,5)}),
    JSON.stringify({...tamil,hashtags:[...tags,tags[0]]}),
    JSON.stringify({...tamil,hashtags:[...tags.slice(0,6),'#Not A Tag']}),
    JSON.stringify({...tamil,hashtags:[...tags.slice(0,6),'#Colombo']}),
    JSON.stringify({variations:{Tamil:{...base,story:''}},hashtags:tags}),
    JSON.stringify({variations:{Tamil:{...base,hook:'Generic English caption only.'}},hashtags:tags}),
    JSON.stringify(english),
    JSON.stringify({variations:{...tamil.variations,...english.variations},hashtags:tags}),
    '{broken json',
  ])assert.equal(parseGeminiCaptionOutput(broken,'ta'),null);
});

test('Owner-safe copywriter prompt contains all five content rules and no model-controlled identity',()=>{
  const data={
    businessId:'11111111-1111-4111-8111-111111111111',
    requestKey:'44444444-4444-4444-8444-444444444444',
    objective:'promotion',language:'ta',mode:'three_angles',tone:'friendly',
    campaignGoal:'flash_sale',
    message:'எங்கள் கடையில் புதிய பொருட்கள் கிடைக்கின்றன',
    conditions:'',cta:'Contact us for details',
    posterHeadline:'Festival offers',posterOffer:'Up to 30% discount',
  };
  const v=validateCaptionInput(data);assert.equal(v.ok,true);
  if(!v.ok)return;
  const [system,user]=buildCaptionMessages({
    businessName:'Our Shop',category:'Retail',city:'Jaffna',
    brandName:'Our Shop',slogan:'',audience:'Local customers',
    tone:'friendly',guidelines:'',
  },v.value);
  for(const term of ['elite Sri Lankan Social Media Copywriter','first 110 characters',
    '6–8 clean','verified real city','Return JSON ONLY','Do not use false urgency',
    'UNVERIFIED creative reference','natural Sri Lankan commercial Tamil']){
    assert.ok(system.content.includes(term),term);
  }
  assert.match(user.content,/campaignGoal/);
  assert.match(user.content,/posterHeadline|linkedPosterCreativeReference/);
  assert.match(user.content,/Jaffna/);
  assert.match(user.content,/Up to 30% discount/);
  assert.equal(validateCaptionInput({...data,campaignGoal:'unauthorized'}).ok,false);
  assert.equal(validateCaptionInput({...data,posterOffer:'X'.repeat(181)}).ok,false);
});

test('Gemini route uses same Poster model, JSON constraint and existing credit flow',()=>{
  const route=read('app/api/marketing/caption/route.ts');
  const page=read('app/vendor/marketing/captions/page.tsx');
  const model=read('lib/marketing/poster-gemini-intelligence.ts');
  const reserve=route.indexOf("admin.rpc('marketing_reserve_ai_draft'");
  const generate=route.indexOf("GEMINI_POSTER_MODEL+':generateContent'");
  const settle=route.indexOf("admin.rpc('marketing_complete_ai_draft'");
  assert.match(model,/GEMINI_POSTER_MODEL='gemini-3\.5-flash-lite'/);
  assert.ok(reserve>0&&generate>reserve&&settle>generate);
  assert.match(route,/responseMimeType:'application\/json'/);
  assert.match(route,/responseSchema:captionGeminiResponseSchema\(brief.language\)/);
  assert.match(route,/parseGeminiCaptionOutput\(rawCaption,brief.language,business.city\|\|''\)/);
  assert.match(route,/serializeGeminiCaptionOutput\(structured,brief.language\)/);
  assert.match(route,/admin\.rpc\('marketing_refund_ai_draft'/);
  assert.match(route,/isPosterInternalQAAccount/);
  assert.match(page,/campaignGoal:goal/);
  assert.match(page,/posterHeadline:hasLinked/);
  assert.match(page,/posterOffer:hasLinked/);
  assert.match(page,/setGeneratedTags\(nextTags\)/);
  assert.match(page,/extractSavedCaptionHashtags\(data.draft.caption\)/);
  assert.match(page,/const brief=plannerBriefFromCaption\(/);
});
