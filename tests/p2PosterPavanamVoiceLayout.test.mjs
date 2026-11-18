import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {POSTER_FONT_PAIRS,validatePosterBlueprint} from '../lib/marketing/poster-design-blueprint.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=read('app/vendor/marketing/design/puter-lab/page.tsx');
const css=read('app/vendor/marketing/design/puter-lab/typography.css');
const composer=read('lib/marketing/puter-poster-composer.ts');
const renderer=read('lib/marketing/puter-premium-poster-renderer.ts');
const brain=read('lib/marketing/poster-gemini-design-blueprint.ts');
const api=read('app/api/marketing/poster/puter-lab/route.ts');
const layout=read('lib/marketing/poster-premium-presets.ts');

test('Tamil heading AND body must both use Pavanam; heading has real heavier Canvas treatment',()=>{
  assert.deepEqual(POSTER_FONT_PAIRS.ta.map(({headlineFont,bodyFont})=>[headlineFont,bodyFont]),
    [['Pavanam','Pavanam']]);
  assert.match(css,/family=Pavanam/);
  assert.match(renderer,/if\(language==='ta'\)return '"Pavanam",'/);
  assert.match(renderer,/ctx\.strokeText\(line,x,y\)/);
  assert.match(renderer,/p\.language==='ta'&&p\.role==='display'/);
  assert.match(composer,/ta:'"Pavanam"/);
  assert.match(composer,/document\.fonts\.load\(\(language==='en'\?700:400\)/);
  assert.doesNotMatch(css,/family=Noto\+Sans\+Tamil|family=Noto\+Serif\+Tamil/);
});

test('Sinhala display is Gemunu Libre, supporting copy is Maname; English stays unchanged',()=>{
  assert.deepEqual(POSTER_FONT_PAIRS.si.map(({headlineFont,bodyFont})=>[headlineFont,bodyFont]),
    [['Gemunu Libre','Maname']]);
  assert.match(css,/family=Gemunu\+Libre/);
  assert.match(css,/family=Maname/);
  assert.match(renderer,/language==='si'[\s\S]*?'"Gemunu Libre"/);
  assert.match(renderer,/role==='display'\?/);
  assert.match(renderer,/'"Maname"/);
  assert.match(composer,/requires\.push\(\['700 84px "Gemunu Libre"'/);
  assert.match(composer,/requires\.push\(\['400 40px "Maname"'/);
});

test('legacy valid Gemini font names are normalized to Pavanam instead of rendering old fonts',()=>{
  const draft={
    posterCopy:{headline:'பொங்கல் சிறப்புச் சலுகை',offerText:'',ctaText:'இன்றே தொடர்பு கொள்ளவும்'},
    styling:{vibe:'festive',headlineFont:'Noto Serif Tamil',bodyFont:'Mukta Malar',
      primaryColor:'#224466',accentColor:'#FF7700',textColor:'#FFFFFF',overlayGradient:'dark_bottom_top'},
    imagePrompt:'Premium Sri Lankan harvest festival background. An ornate clay pot, rice harvest and soft sunlight dominate the center of the frame. Use clean typography-safe space only in the top and lower sections. Rich natural colors, elegant commercial style, and cinematic materials with visual depth. NO text, NO letters, NO numbers, NO signs, NO logos, pure background artwork only.',
  };
  const parsed=validatePosterBlueprint(draft,{language:'ta',vendorPrompt:'பொங்கல் வாழ்த்து'});
  assert.equal(parsed.styling.headlineFont,'Pavanam');
  assert.equal(parsed.styling.bodyFont,'Pavanam');
  assert.throws(()=>validatePosterBlueprint({...draft,styling:{...draft.styling,headlineFont:'https://untrusted.example/font.ttf'}},{language:'ta',vendorPrompt:'பொங்கல் வாழ்த்து'}),/font not approved/);
});

test('all native dropdowns share an inset arrow unaffected by native browser padding',()=>{
  for(const id of ['puter-business','puter-language','puter-model','puter-panel-style','puter-safe-layout'])
    assert.match(ui,new RegExp('<select id="'+id+'"[^]*?className="slbi-poster-select'));
  assert.equal((ui.match(/className="slbi-poster-select /g)||[]).length,5);
  assert.match(css,/appearance:none/);
  assert.match(css,/padding-right:2\.65rem/);
  assert.match(css,/background-position:right 14px center/);
  assert.match(css,/background-repeat:no-repeat/);
});

test('voice transcript remains same vendor brief for Gemini and artwork, and errors are scoped to blueprint status',()=>{
  assert.match(ui,/setPrompt\(combined\)/);
  assert.match(ui,/businessId,prompt:prompt\.trim\(\),referenceContext:referenceSummary,language/);
  assert.match(ui,/request:withPosterReferenceSummary\(prompt,referenceSummary\)/);
  assert.match(ui,/designAdvisory&&<p role="status"/);
  assert.match(ui,/Your voice transcript is ready and editable/);
  assert.match(ui,/data\.code==='GEMINI_BLUEPRINT_INVALID'/);
  assert.match(api,/code:'GEMINI_BLUEPRINT_INVALID'/);
  assert.match(api,/code:'GEMINI_BLUEPRINT_UNAVAILABLE'/);
  assert.match(api,/auth|getUser|owner/);
  assert.match(brain,/vendorRequest is the owner-approved original voice TRANSCRIPT/);
  assert.match(brain,/responseSchema:\{/);
  assert.match(brain,/responseMimeType:'application\/json'/);
  assert.match(brain,/maxOutputTokens:3500/);
});

test('poster headline is compact and hero consumes visual middle; prior successful preview remains safe',()=>{
  assert.match(renderer,/maxLines:2/);
  assert.match(renderer,/const titleMax=h\*\(format==='square'\?\.26:\.27\)/);
  assert.match(renderer,/displayLanguage==='ta'\?1\.18/);
  assert.match(composer,/CENTRAL 19–58%/);
  assert.match(layout,/HERO SUBJECT across MIDDLE 19%-58%/);
  assert.match(ui,/Preserve the last successful preview visually during copy\/language edits/);
  assert.match(ui,/!finalBlob\|\|!finalUrl\|\|composing\|\|!copyLanguageConsistent/);
  assert.match(ui,/!finalBlob\|\|composing\|\|generating\|\|!copyLanguageConsistent/);
});
