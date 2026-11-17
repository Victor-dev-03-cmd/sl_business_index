import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePosterBlueprint,POSTER_FONT_PAIRS} from '../lib/marketing/poster-design-blueprint.ts';
import {planStackedCard} from '../lib/marketing/puter-adaptive-card-layout.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const gemini=read('lib/marketing/poster-gemini-design-blueprint.ts');
const api=read('app/api/marketing/poster/puter-lab/route.ts');
const page=read('app/vendor/marketing/design/puter-lab/page.tsx');
const renderer=read('lib/marketing/puter-premium-poster-renderer.ts');
const composer=read('lib/marketing/puter-poster-composer.ts');
const handoff=read('lib/marketing/caption-poster-handoff.ts');
const caption=read('app/vendor/marketing/captions/page.tsx');

function design(language='ta',serviceFocus='வலைத்தள மற்றும் செயலி உருவாக்கம்',
  focusEvidence='website and mobile app development',percent='15%'){
  const font=POSTER_FONT_PAIRS[language][0];
  return {
    posterCopy:{
      headline:language==='ta'?'தீபாவளி சிறப்பு':
        language==='si'?'දීපාවලි විශේෂ':'Deepavali Special',
      offerText:language==='ta'?percent+' தள்ளுபடி':
        language==='si'?percent+' වට්ටමක්':percent+' OFF',
      ctaText:language==='ta'?'இன்றே தொடர்பு கொள்ளவும்':
        language==='si'?'අදම අප අමතන්න':'Contact Us Today',
      serviceFocus,focusEvidence,
    },
    styling:{
      vibe:'festive',headlineFont:font.headlineFont,bodyFont:font.bodyFont,
      primaryColor:'#14143F',accentColor:'#FF8800',textColor:'#FFFFFF',
      overlayGradient:'dark_bottom_top',
    },
    imagePrompt:'Rich professional editorial photography for a software studio offering genuine web and mobile app development, a sophisticated development workspace with high-quality devices, and restrained Deepavali diyas as tasteful festive accents. Keep the actual software craft visibly central with dark navy and warm gold lighting. Leave clean spaces for exact Canvas text only. NO text, NO letters, NO numbers, NO signs, NO logos, pure background artwork only.',
  };
}

test('Gemini may suggest an exact Tamil promoted service grounded in owner brief without inventing 15%',()=>{
  const request='Create a Deepavali 15% promotion for website and mobile app development';
  const parsed=validatePosterBlueprint(design(),{
    language:'ta',vendorPrompt:request,verifiedCategory:'Professional Services',
  });
  assert.equal(parsed.posterCopy.serviceFocus,'வலைத்தள மற்றும் செயலி உருவாக்கம்');
  assert.equal(parsed.posterCopy.focusEvidence,'website and mobile app development');
  assert.equal(parsed.posterCopy.offerText,'15% தள்ளுபடி');
  assert.deepEqual(POSTER_FONT_PAIRS.ta.map(x=>[x.headlineFont,x.bodyFont]),[['Pavanam','Pavanam']]);
});

test('Verified business description can ground Sinhala service in an English festival brief',()=>{
  const req='Make a Deepavali 15% offer poster for my actual services';
  const parsed=validatePosterBlueprint(design('si','වෙබ් අඩවි සහ යෙදුම් සංවර්ධනය','websites and mobile applications'),{
    language:'si',vendorPrompt:req,
    verifiedCategory:'Professional Services',
    verifiedDescription:'We design responsive websites and mobile applications for clients.',
  });
  assert.equal(parsed.posterCopy.serviceFocus,'වෙබ් අඩවි සහ යෙදුම් සංවර්ධනය');
  assert.deepEqual(POSTER_FONT_PAIRS.si.map(x=>[x.headlineFont,x.bodyFont]),[['Gemunu Libre','Maname']]);
});

test('Generic business category, forged evidence or unrelated source cannot authorize new services',()=>{
  const opts={language:'ta',vendorPrompt:'Create a Deepavali greeting with 15% special offer',
    verifiedCategory:'Professional Services',verifiedDescription:''};
  const bogus=validatePosterBlueprint(design('ta','வலைத்தள மற்றும் செயலி உருவாக்கம்','Professional Services'),opts);
  assert.equal(bogus.posterCopy.serviceFocus,'');
  assert.equal(bogus.posterCopy.focusEvidence,'');
  const imaginary=validatePosterBlueprint(design('ta','மருத்துவ ஆலோசனைகள்','medical consulting'),opts);
  assert.equal(imaginary.posterCopy.serviceFocus,'');
  const wrongScript=validatePosterBlueprint(design('ta','Website Development','15% special offer'),opts);
  assert.equal(wrongScript.posterCopy.serviceFocus,'');
  const numeric=validatePosterBlueprint(design('ta','24/7 மருத்துவ சேவை','15% special offer'),opts);
  assert.equal(numeric.posterCopy.serviceFocus,'');
  const contact=validatePosterBlueprint(design('ta','https://example.com','15% special offer'),opts);
  assert.equal(contact.posterCopy.serviceFocus,'');
});

test('No unapproved percent is allowed even if Gemini focuses on an actual service',()=>{
  assert.throws(()=>validatePosterBlueprint(design('ta','வலைத்தள உருவாக்கம்','website development','15%'),{
    language:'ta',vendorPrompt:'We provide website development with a Deepavali greeting only',
  }),/invented or changed a percentage/);
});

test('Gemini return schema requires service focus with original-phrase evidence',()=>{
  assert.match(gemini,/posterCopy\.serviceFocus/);
  assert.match(gemini,/posterCopy\.focusEvidence/);
  assert.match(gemini,/EXACT contiguous quote/);
  assert.match(gemini,/category is context ONLY/);
  assert.match(gemini,/festival is the secondary CAMPAIGN THEME/);
  assert.match(gemini,/serviceFocus:\{type:'string'\}/);
  assert.match(gemini,/focusEvidence:\{type:'string'\}/);
  assert.match(gemini,/verifiedDescription:input\.facts\.description/);
  assert.match(api,/\.eq\('id',id\)\.eq\('owner_id',userId\)/);
  assert.match(api,/marketing_poster_voice_try_reserve/);
});

test('Poster Studio reviews exact focus before paid generation, export or handoff',()=>{
  assert.match(page,/id="puter-service-focus"/);
  assert.match(page,/Promoted product or service/);
  assert.match(page,/setServiceFocus\(data\.blueprint\.posterCopy\.serviceFocus\|\|''\)/);
  assert.match(page,/setServiceFocusApproved\(false\)/);
  assert.match(page,/I confirm this is a real product\/service offered by the selected business/);
  assert.match(page,/if\(!serviceFocusApproved\)/);
  assert.match(page,/if\(!serviceFocus\.trim\(\)\)/);
  assert.match(page,/focus:serviceFocus\.trim\(\)/);
  assert.match(page,/!serviceFocusApproved\)return/);
  assert.match(page,/setServiceFocus\(''\);setServiceEvidence\(''\)/);
  assert.match(page,/serviceFocus:serviceFocusApproved\?serviceFocus\.trim\(\):''/);
  assert.match(page,/businessDescription:facts\.description/);
  assert.match(page,/businessCategory:facts\.category/);
});

test('Canvas places the promoted offering above real offer + category with unchanged Unicode fonts',()=>{
  assert.match(renderer,/const focus=copy\.focus\?\.trim\(\)\?fit/);
  assert.match(renderer,/focusHeight:focus\?\.height\|\|0/);
  assert.match(renderer,/if\(focus&&layout\.focusY!==null\)/);
  assert.match(renderer,/label:'Promoted product or service'/);
  assert.match(renderer,/const focusLanguage=scriptOf\(copy\.focus\|\|''/);
  const plan=planStackedCard({
    format:'story',canvasHeight:1920,scale:1,
    brandHeight:56,focusHeight:189,offerHeight:92,serviceHeight:45,
    hasCta:true,contactRows:2,contentFocus:true,
  });
  assert.ok(plan.brandY<plan.focusY);
  assert.ok(plan.focusY<plan.offerY);
  assert.ok(plan.offerY<plan.serviceY);
  assert.ok(plan.serviceY<plan.ctaY);
  assert.ok(plan.top>0&&plan.contactsY+plan.contactsHeight<=plan.bottom);
  assert.match(renderer,/if\(language==='ta'\)return '"Pavanam",/);
  assert.match(renderer,/'"Gemunu Libre"/);
  assert.match(renderer,/'"Maname"/);
});

test('Artwork prompt prioritizes actual service and complementary festival mood without fictitious copy',()=>{
  assert.match(composer,/OWNER-REVIEWED PROMOTED PRODUCT\/SERVICE/);
  assert.match(composer,/Verified public business description/);
  assert.match(composer,/VISUAL RELEVANCE IS MANDATORY/);
  assert.match(composer,/Depict credible objects\/workflows/);
  assert.match(composer,/STRICT: NO TEXT of any kind in the AI artwork/);
  assert.match(composer,/input\.serviceFocus/);
});

test('Poster → Caption handoff carries approved service focus without changing ownership isolation',()=>{
  assert.match(handoff,/serviceFocus\?:string/);
  assert.match(handoff,/serviceFocus:clean\(context\.serviceFocus,85\)/);
  assert.match(page,/headline:headline\.trim\(\),offer:offer\.trim\(\),serviceFocus:serviceFocus\.trim\(\)/);
  assert.match(caption,/record\.context\.serviceFocus/);
  assert.match(caption,/businesses\.some\(b=>b\.id===record\.context\.businessId\)/);
  assert.match(handoff,/MAX_AGE=2\*60\*60\*1000/);
});
