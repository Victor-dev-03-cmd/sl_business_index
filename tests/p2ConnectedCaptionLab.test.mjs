import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  GOALS,LANGUAGES,ANGLES,PLATFORMS,emptyCaptions,parseThreeAngles,
  removeHashtags,hashtagsFrom,normalizedTag,withHashtags,previewFold,
  safeLocalPolish,goalObjective,languageBundle,
} from '../lib/marketing/caption-workspace.ts';
import {validHandoffId} from '../lib/marketing/caption-poster-handoff.ts';
import {validateCaptionInput,buildCaptionMessages} from '../lib/marketing/caption-contract.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('app/vendor/marketing/captions/page.tsx');
const poster=read('app/vendor/marketing/design/puter-lab/page.tsx');
const planner=read('app/vendor/marketing/campaigns/page.tsx');
const api=read('app/api/marketing/caption/route.ts');
const contracts=read('lib/marketing/caption-contract.ts');

test('SLBI PRO Caption Lab uses existing Poster three-column mental model and GrowthOS palette',()=>{
  for(const label of ['01','02','03','Campaign Brief','Live Social Preview','Refine & Copy'])
    assert.ok(page.includes(label),label);
  assert.match(page,/xl:grid-cols-\[minmax\(0,30fr\)_minmax\(0,42fr\)_minmax\(0,28fr\)\]/);
  assert.match(page,/#F97316/);
  assert.match(page,/#111827/);
  assert.match(page,/#E5E7EB/);
  assert.match(page,/rounded-2xl border border-\[#E5E7EB\] bg-white/);
  assert.match(page,/id="caption-tone"/);
  assert.match(page,/id="caption-brief"/);
  assert.match(page,/promptChips\.map/);
  const css=read('app/vendor/marketing/captions/caption-fonts.css');
  assert.match(css,/Noto\+Sans\+Tamil/);
  assert.match(css,/Noto\+Sans\+Sinhala/);
  assert.match(css,/line-height:1\.6/);
});

test('tri-lingual previews support Facebook Instagram WhatsApp, read more and human editing',()=>{
  assert.deepEqual(LANGUAGES,['ta','si','en']);
  assert.deepEqual(PLATFORMS,['facebook','instagram','whatsapp']);
  assert.deepEqual(ANGLES,['hook','story','short']);
  assert.equal(GOALS.length,5);
  assert.equal(page.includes('Social preview · Just now · Not published'),true);
  assert.match(page,/chosenLanguages\.map/);
  assert.match(page,/All 3 Combined/);
  assert.match(page,/previewFold\(previewText,expanded\)/);
  assert.match(page,/setExpanded\(true\)/);
  assert.match(page,/updateAngle\(activePreviewLanguage,e\.target\.value\)/);
  assert.match(page,/aria-label="Live Social Preview"/);
  assert.match(page,/Mockup only/);
  assert.match(page,/No poster linked · captions work independently/);
  const fold=previewFold('A'.repeat(240),false);
  assert.equal(fold.folded,true);
  assert.equal(previewFold('A'.repeat(240),true).folded,false);
  const result=emptyCaptions();
  result.ta.hook='தமிழ் பதிவு';result.si.hook='සිංහල පළ කිරීම';result.en.hook='English post';
  assert.match(languageBundle(result,'hook',['ta','si','en']),/தமிழ்.*සිංහල.*English/s);
});

test('three angles are genuinely parsed from the existing authenticated AI provider output',()=>{
  const source='[[HOOK]] A real offer hook. #Jaffna\n[[STORY]] We serve our customers with care.\n[[SHORT]] Call our store.';
  assert.deepEqual(parseThreeAngles(source),{
    hook:'A real offer hook. #Jaffna',
    story:'We serve our customers with care.',
    short:'Call our store.',
  });
  assert.deepEqual(parseThreeAngles('One legacy caption'),{
    hook:'One legacy caption',story:'',short:'',
  });
  const good={
    businessId:'11111111-1111-4111-8111-111111111111',
    requestKey:'44444444-4444-4444-8444-444444444444',
    objective:'promotion',language:'ta',
    message:'எங்கள் கடையில் புதிய உணவு கிடைக்கிறது',
    conditions:'',cta:'',mode:'three_angles',tone:'friendly',
  };
  const valid=validateCaptionInput(good);
  assert.equal(valid.ok,true);
  if(valid.ok){
    const messages=buildCaptionMessages({
      businessName:'Owned Store',category:'Retail',city:'Jaffna',
      brandName:'Owned Store',slogan:'',audience:'',
      tone:'friendly',guidelines:'',
    },valid.value);
    assert.match(messages[0].content,/exactly THREE distinct reviewed drafts/);
    assert.match(messages[0].content,/\[\[HOOK\]\]/);
    assert.match(messages[0].content,/Do not use false urgency/);
    assert.match(messages[1].content,/requestedTone/);
  }
  assert.equal(validateCaptionInput({...good,mode:'unlimited_free'}).ok,false);
  assert.equal(validateCaptionInput({...good,tone:'manipulative'}).ok,false);
  assert.equal(goalObjective.education,'awareness');
});

test('hashtag controls are editable, script-aware and never silently create false location tags',()=>{
  assert.deepEqual(hashtagsFrom('#Jaffna #இலங்கை #Jaffna #ශ්‍රීලංකා'),
    ['#Jaffna','#இலங்கை','#ශ්‍රීලංකා']);
  assert.equal(normalizedTag('  #Ceylon_2026 '),'#Ceylon_2026');
  assert.equal(normalizedTag('!!'),null);
  assert.equal(removeHashtags('Hello #Jaffna #Offer'),'Hello');
  assert.equal(withHashtags('Hello #Old',['#Jaffna','#SLBI']),'Hello\n\n#Jaffna #SLBI');
  assert.match(page,/editTags\(tag,'remove'\)/);
  assert.match(page,/onClick=\{\(\)=>void copyCaption\(true\)\}/);
  assert.match(page,/onClick=\{\(\)=>void copyCaption\(false\)\}/);
});

test('local polish preserves truth and requires no billing or image model',()=>{
  assert.equal(safeLocalPolish('Our service is available.','emojis','en',
    {phone:'',city:'',website:''}),'✨ Our service is available.');
  assert.match(safeLocalPolish('Real product','contact','en',
    {phone:'0771234567',city:'Jaffna',website:'https://example.lk'}),/Jaffna · 0771234567/);
  assert.doesNotMatch(safeLocalPolish('Discover our shop','urgency','en',
    {phone:'',city:'',website:''}),/last day|only today|limited stock/i);
  assert.match(page,/No new AI credits/);
  assert.match(page,/const polish=\(kind:/);
  assert.doesNotMatch(read('lib/marketing/caption-workspace.ts'),/fetch\(|puter\.ai|GEMINI_API_KEY/);
});

test('Poster Studio sends only a random one-time local key and never embeds PNG in URL',()=>{
  const store=read('lib/marketing/caption-poster-handoff.ts');
  assert.match(store,/indexedDB\.open\(DB_NAME,1\)/);
  assert.match(store,/MAX_AGE=2\*60\*60\*1000/);
  assert.match(store,/image\.type!=='image\/png'/);
  assert.match(store,/crypto\.randomUUID\(\)/);
  assert.match(store,/return id/);
  assert.match(poster,/saveLinkedPoster\(\{/);
  assert.match(poster,/Write Caption for this Poster/);
  assert.match(poster,/window\.location\.assign\('\/vendor\/marketing\/captions\?handoff='\+encodeURIComponent\(id\)\)/);
  assert.match(poster,/sample:!isRealOutput/);
  assert.match(page,/loadLinkedPoster\(key\)/);
  assert.match(page,/businesses\.some\(b=>b\.id===record\.context\.businessId\)/);
  assert.match(page,/URL\.createObjectURL\(record\.image\)/);
  assert.match(page,/Linked from Poster Studio/);
  assert.equal(validHandoffId('11111111-1111-4111-8111-111111111111'),true);
  assert.equal(validHandoffId('https://untrusted.example/image.png'),false);
  assert.equal(validHandoffId('../../admin'),false);
  assert.doesNotMatch(store,/localStorage|sessionStorage|public\/uploads|base64/);
});

test('AI calls occur only on explicit generate, respect existing global hard-off and credit ledger',()=>{
  assert.match(api,/process\.env\.SLBI_MARKETING_AI_ENABLED!=='true'/);
  assert.match(api,/admin\.rpc\('marketing_reserve_ai_draft'/);
  assert.match(api,/admin\.rpc\('marketing_refund_ai_draft'/);
  assert.match(api,/admin\.rpc\('marketing_complete_ai_draft'/);
  assert.match(api,/max_completion_tokens:brief\.mode==='three_angles'\?1100:MAX_OUTPUT_TOKENS/);
  assert.match(contracts,/mode\?:CaptionMode/);
  assert.match(page,/const generate=async\(\)=>/);
  assert.match(page,/onClick=\{\(\)=>void generate\(\)\}/);
  assert.match(page,/requestKey:crypto\.randomUUID\(\)/);
  assert.match(page,/mode:'three_angles'/);
  assert.match(page,/One provider request and applicable credit reservation per selected language/);
  assert.match(page,/never auto-charged on page open/);
  const link=poster.indexOf('const continueToCaption=async()=>');
  const end=poster.indexOf('  const locked=',link);
  assert.ok(link>0&&end>link);
  assert.doesNotMatch(poster.slice(link,end),/puter\.ai|generate\(\)|caption\/route/);
});

test('Campaign Planner saves tri-language caption bundle and displays same-device original PNG',()=>{
  const linked=read('app/vendor/marketing/campaigns/LinkedCaptionPoster.tsx');
  assert.match(page,/supabase\.from\('marketing_campaigns'\)\.insert\(patch\)/);
  assert.match(page,/\.eq\('id',businessId\)\.eq\('owner_id',user\.id\)/);
  assert.match(page,/captionBundle:captions/);
  assert.match(page,/posterLocalKey:hasLinked\?posterKey:null/);
  assert.match(page,/status:'drafted'/);
  assert.match(page,/href="\/vendor\/marketing\/campaigns\?source=caption-lab"/);
  assert.match(planner,/createdFrom==='caption_lab'/);
  assert.match(planner,/LinkedCaptionPoster localKey=\{c\.brief\.posterLocalKey\}/);
  assert.match(planner,/get\('source'\)==='caption-lab'/);
  assert.match(linked,/loadLinkedPoster\(localKey\)/);
  assert.match(linked,/found\.context\.businessId!==businessId/);
  assert.match(linked,/on this device/);
  assert.doesNotMatch(linked,/supabase\.storage|storage\.from/);
  assert.match(page,/Linked PNG remains on this device/);
});
