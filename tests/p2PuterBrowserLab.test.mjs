import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const lab=read('app/vendor/marketing/design/puter-lab/page.tsx');
const compose=read('lib/marketing/puter-poster-composer.ts');
const api=read('app/api/marketing/poster/puter-lab/route.ts');
const labGate=read('app/vendor/marketing/design/puter-lab/layout.tsx');
const parent=read('app/vendor/marketing/design/layout.tsx');
const provider=read('lib/marketing/poster-image-provider.ts');

test('Puter lab remains strictly server-authorized for existing owner QA grant',()=>{
  assert.match(parent,/MarketingProOnly/);
  assert.match(labGate,/auth\.getUser\(\)/);
  assert.match(labGate,/isPosterInternalQAAccount\(user\.id,client\)/);
  assert.match(labGate,/notFound\(\)/);
  assert.match(api,/import 'server-only'/);
  assert.match(api,/isPosterInternalQAAccount\(user\.id,client\)/);
  assert.match(api,/\.eq\('owner_id',userId\)/);
  assert.match(api,/preparePosterBusinessFacts\(b,byId\.get\(b\.id\)\|\|null\)/);
  assert.match(api,/\.eq\('id',id\)\.eq\('owner_id',userId\)/);
  assert.match(api,/Cache-Control.*private, no-store/);
  assert.doesNotMatch(api,/user\.email|user_metadata|NEXT_PUBLIC_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(lab,/SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_PUTER_TOKEN|GEMINI_API_KEY/);
});
test('Gemini voice transcription is human-review only, with scoped mic policy',()=>{
  const voice=read('app/api/marketing/poster/transcribe/route.ts');
  const next=read('next.config.ts');
  assert.match(lab,/navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\)/);
  assert.match(lab,/rec\.start\(250\)/);
  assert.match(lab,/stopVoice\(\)/);
  assert.match(lab,/transcribe\(new Blob\(chunks/);
  assert.match(lab,/\/api\/marketing\/poster\/transcribe/);
  assert.match(lab,/x-slbi-business-id/);
  assert.match(lab,/setPrompt\(prev=>\[prev,heard\]/);
  assert.match(lab,/const maxAudio=1_500_000/);
  assert.match(voice,/reviewBeforeGenerating:true/);
  assert.match(voice,/GEMINI_POSTER_MODEL/);
  assert.match(next,/source: '\/vendor\/marketing\/design\/puter-lab'/);
  assert.match(next,/value: 'camera=\(\), microphone=\(self\), geolocation=\(self\)'/);
  assert.match(next,/value: 'camera=\(\), microphone=\(\), geolocation=\(self\)'/);
  assert.doesNotMatch(lab,/setTimeout\(\(\)=>\{if\(rec.state==='recording'\)rec.stop\(\)/);
});
test('Gemini brief checks owner facts and reserves existing atomic daily budget',()=>{
  assert.match(api,/isSameOrigin/);
  assert.match(api,/isPosterIntelligenceEnabled/);
  assert.match(api,/createGeminiPosterBrief\(\{/);
  assert.match(api,/marketing_poster_voice_try_reserve/);
  assert.ok(api.indexOf("admin.rpc('marketing_poster_voice_try_reserve'") <
    api.indexOf('createGeminiPosterBrief({'));
  assert.match(lab,/prepareWithGemini/);
  assert.match(lab,/setHeadline\(data\.brief\.suggestedHeadline\)/);
  assert.match(lab,/setCta\(data\.brief\.suggestedCallToAction\)/);
  assert.match(lab,/setBriefKey\(forKey\)/);
  assert.match(lab,/review the text|Review the text|Review exact headline/);
  assert.doesNotMatch(api,/marketing_poster_reserve|marketing_poster_claim|marketing_poster_complete/);
});
test('Puter User-Pays action remains explicit, no API token, no SLBI credits',()=>{
  assert.match(lab,/https:\/\/js\.puter\.com\/v2\//);
  assert.match(lab,/await puter\.auth\.signIn\(\)/);
  assert.match(lab,/puter\.ai\.txt2img\(creative,options\)/);
  assert.match(lab,/test_mode:!realMode/);
  assert.match(lab,/realMode&&!consent/);
  assert.match(lab,/setRealMode\(e\.target\.checked\);setConsent\(false\)/);
  assert.match(lab,/onClick=\{\(\)=>void generate\(\)\}/);
  assert.match(lab,/Generate no-credit poster sample/);
  assert.match(lab,/may create a charge/);
  assert.doesNotMatch(lab,/storage\.from|marketing_poster_reserve|growth_credits|localStorage/);
});
test('canvas composes all four exact sizes with Unicode font shaping',()=>{
  const formats=read('lib/marketing/poster-design.ts');
  assert.match(formats,/square:\{width:1080,height:1080/);
  assert.match(formats,/portrait:\{width:1080,height:1350/);
  assert.match(formats,/story:\{width:1080,height:1920/);
  assert.match(formats,/landscape:\{width:1200,height:630/);
  assert.match(compose,/canvas\.width=d\.width;canvas\.height=d\.height/);
  assert.match(compose,/ctx\.fillText\(line,params\.x,params\.y\+i\*lineH\)/);
  assert.match(compose,/new Intl\.Segmenter/);
  assert.match(compose,/Noto Sans Tamil/);
  assert.match(compose,/Noto Sans Sinhala/);
  assert.match(compose,/text-free|NO TEXT/i);
  assert.match(compose,/canvas\.toBlob/);
  assert.match(compose,/image\.crossOrigin='anonymous'/);
  assert.match(compose,/exact words were NOT truncated or changed/);
  assert.match(lab,/composeExactPoster\(\{backgroundSrc:artworkSrc,format,copy:exactCopy,/);
  assert.match(lab,/style:selectedPremiumStyle,design:activeDesign/);
  assert.match(lab,/anchor\.download=/);
  assert.match(lab,/finalBlob/);
  assert.doesNotMatch(compose,/format==='story'.*1024x/);
});
test('only approved published contacts are drawn and changing copy avoids a new AI call',()=>{
  assert.match(lab,/businessName:facts\.name/);
  assert.match(lab,/service:facts\.category/);
  assert.match(lab,/phone:showPhone\?facts\.phone:''/);
  assert.match(lab,/website:showWebsite\?facts\.website:''/);
  assert.match(compose,/extractExplicitPercentage/);
  assert.match(compose,/Never infer an amount/);
  assert.match(compose,/copy\.website/);
  assert.match(compose,/copy\.phone/);
  assert.match(lab,/Editing headline, offer, CTA, contact visibility or size rebuilds the PNG locally/);
  assert.doesNotMatch(compose,/OpenAI|Gemini API|createGeminiPosterBrief/);
});
test('production Cloudflare provider and Turnstile login remain unchanged',()=>{
  const login=read('app/login/page.tsx');
  const backend=read('app/api/auth/password-login/route.ts');
  assert.match(provider,/const CF_MODEL='@cf\/black-forest-labs\/flux-2-klein-4b'/);
  assert.match(login,/siteKey=\{process\.env\.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY!\}/);
  assert.match(backend,/const secret = process\.env\.CLOUDFLARE_TURNSTILE_SECRET_KEY/);
  assert.match(backend,/https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.doesNotMatch(lab,/CLOUDFLARE_TURNSTILE_SECRET_KEY|SLBI_POSTER_IMAGE_PROVIDER/);
});


test('desktop layout uses the agreed LEFT controls, CENTER poster and RIGHT settings',()=>{
  assert.match(lab,/xl:grid-cols-\[minmax\(0,0\.91fr\)_minmax\(0,1\.36fr\)_minmax\(0,0\.9fr\)\]/);
  assert.match(lab,/xl:h-\[calc\(100dvh-9\.5rem\)\]/);
  assert.match(lab,/xl:overflow-hidden/);
  const left=lab.indexOf('aria-label="Poster creation controls"');
  const center=lab.indexOf('aria-label="Exact AI poster preview"');
  const right=lab.indexOf('aria-label="Poster size and exact text settings"');
  assert.ok(left>0&&center>left&&right>center,'left, preview, right DOM order');
  assert.match(lab,/lg:order-1/);
  assert.match(lab,/lg:order-2/);
  assert.match(lab,/order-3/);
  assert.match(lab,/xl:overflow-y-auto/);
  assert.match(lab,/h-\[min\(60dvh,620px\)\]/);
  assert.match(lab,/xl:h-auto xl:min-h-0/);
  assert.match(lab,/h-full w-full max-h-full max-w-full object-contain/);
  assert.doesNotMatch(lab,/max-h-\[72vh\]/);
});
test('compact four-format SVG picker reuses Campaign Planner picture silhouettes',()=>{
  const original=read('app/vendor/marketing/campaigns/CampaignFormatSelector.tsx');
  const selector=read('app/vendor/marketing/design/puter-lab/PuterCompactFormatSelector.tsx');
  for(const key of ["square:{w:70,h:70}","portrait:{w:57,h:76}","story:{w:43,h:76}","landscape:{w:78,h:43}"]){
    assert.ok(original.includes(key),key+' original');
    assert.ok(selector.includes(key),key+' compact');
  }
  assert.match(selector,/role="radiogroup"/);
  assert.match(selector,/role="radio" aria-checked=\{active\}/);
  assert.match(selector,/aria-label=\{names\[type\]\+': '/);
  assert.match(selector,/className="grid grid-cols-4 gap-1\.5"/);
  assert.match(selector,/h-\[43px\]/);
  assert.doesNotMatch(selector,/min-h-\[158px\]/);
  assert.match(lab,/<PuterCompactFormatSelector selected=\{format\} disabled=\{locked\} onChange=\{setFormat\}\/>/);
});
test('UI-only compact redesign preserves voice, Gemini, paid consent and exact PNG behavior',()=>{
  assert.match(lab,/const startVoice=async\(\)=>/);
  assert.match(lab,/const transcribe=async\(blob:Blob\)=>/);
  assert.match(lab,/const prepareWithGemini=async\(\)=>/);
  assert.match(lab,/onClick=\{\(\)=>void generate\(\)\}/);
  assert.match(lab,/realMode&&!consent/);
  assert.match(lab,/canvas|composeExactPoster/);
  assert.match(lab,/anchor\.download=/);
  assert.match(lab,/dimensions\.width\} × \{dimensions\.height\}/);
});


test('seasonal references are original local SVG mini artworks, not scraped public images',()=>{
  const library=read('lib/marketing/poster-reference-library.ts');
  const gallery=read('app/vendor/marketing/design/puter-lab/PuterReferenceGallery.tsx');
  for(const key of ['christmas','newyear','pongal','avurudu','deepavali','halloween','flash','tech','luxury']){
    const svg=read('public/poster-references/'+key+'.svg');
    assert.match(svg,/^<svg /);
    assert.match(svg,/viewBox="0 0 320 256"/);
    assert.doesNotMatch(svg.replace('http://www.w3.org/2000/svg',''),/<image\b|<script\b|http:|https:/);
    assert.match(library,new RegExp("id:'"+key+"'"));
    assert.match(library,new RegExp("/poster-references/"+key+"\\.svg"));
  }
  assert.match(library,/timeZone:'Asia\/Colombo'/);
  assert.match(library,/v\.months\.includes\(month\)\?0:v\.months\.includes\(next\)\?1/);
  assert.match(library,/id:'christmas'.*months:\[11,12\]/);
  assert.match(library,/id:'newyear'.*months:\[12,1\]/);
  assert.match(library,/id:'pongal'.*months:\[1\]/);
  assert.match(library,/id:'avurudu'.*months:\[4\]/);
  assert.match(gallery,/type="button"/); // Accessible native buttons
  assert.match(gallery,/aria-pressed=\{selected\}/);
  assert.match(gallery,/onChoose\(style\)/);
  assert.match(gallery,/showAll\?POSTER_REFERENCE_STYLES:suggestedPosterStyles\(new Date\(\)\)/);
  assert.doesNotMatch(gallery,/images\.unsplash\.com|images\.pexels\.com|google\.com\/search/);
});

test('reference images are transferred only with explicit user opt-in as PNG Blobs',()=>{
  const library=read('lib/marketing/poster-reference-library.ts');
  assert.match(library,/originalReferencePng\(thumbnail:string\)/);
  assert.match(library,/\^\\\/poster-references\\\//);
  assert.match(library,/canvas\.toBlob/);
  assert.match(library,/return await new Promise<Blob>/);
  assert.match(lab,/const \[sendReferenceImage,setSendReferenceImage\]=useState\(false\)/);
  assert.match(lab,/if\(sendReferenceImage&&selectedReference\)/);
  assert.match(lab,/options\.input_images=\[await originalReferencePng\(selectedReference\.thumbnail\)\]/);
  assert.match(lab,/puter\.ai\.txt2img\(creative,options\)/);
  assert.match(lab,/setSendReferenceImage\(false\)/);
  assert.match(lab,/getPosterReferenceStyle\(selectedReferenceId\)/);
  assert.match(lab,/request:prompt\.trim\(\),styleDirection,creativeDirection:briefDirection/);
  assert.doesNotMatch(lab,/NEXT_PUBLIC_UNSPLASH_KEY|PEXELS_API_KEY|google\.com\/search/);
});

test('estimated loading animation never claims actual provider progress or 100 early',()=>{
  const motion=read('app/vendor/marketing/design/puter-lab/PuterGenerationMotion.tsx');
  const motionCss=read('app/vendor/marketing/design/puter-lab/loading-motion.css');
  assert.match(lab,/Math\.min\(89,value\+\(value<65\?3:1\)\)/);
  assert.match(lab,/setEstimatedProgress\(94\)/);
  assert.match(lab,/setEstimatedProgress\(100\);setGenerationStage\('ready'\)/);
  assert.match(lab,/<PuterGenerationMotion/);
  assert.match(motion,/percentage is estimated/);
  assert.match(motion,/aria-valuenow=\{progress\}/);
  assert.match(motion,/progress\}%/);
  assert.match(motion,/relative aspect-\[4\/5\]/);
  assert.match(motionCss,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(motionCss,/@keyframes puter-image-scan/);
  assert.doesNotMatch(motion,/100% completed before model response|true API progress/);
});

test('original poster preview frame is preserved with seasonal suggestions instead of empty state',()=>{
  assert.match(lab,/<PuterReferenceGallery/);
  assert.match(lab,/chosen=\{selectedReferenceId\}/);
  assert.match(lab,/onChoose=\{chooseReference\}/);
  assert.match(lab,/finalUrl&&!browseReferences/);
  assert.match(lab,/setBrowseReferences\(false\)/);
  assert.match(lab,/Browse styles/);
  assert.match(lab,/xl:grid-cols-\[minmax\(0,0\.91fr\)_minmax\(0,1\.36fr\)_minmax\(0,0\.9fr\)\]/);
  assert.match(lab,/Editing headline, offer, CTA, contact visibility or size rebuilds the PNG locally/);
});


test('owner-provided Halloween font, effects and exact color tokens are preserved',()=>{
  const p=read('lib/marketing/poster-premium-presets.ts');
  const css=read('app/vendor/marketing/design/puter-lab/typography.css');
  for(const color of ['#07070C','#18082E','#FF5E00','#FF8A00','#8A2BE2','#FFFFFF','#B8B8C7']){
    assert.ok(p.includes(color),'palette color '+color);
  }
  for(const font of ['Anton','Bebas Neue','Space Grotesk','Plus Jakarta Sans','Inter','JetBrains Mono']){
    assert.ok(p.includes(font),'design font '+font);
    assert.ok(css.includes(font),'loaded font '+font);
  }
  assert.match(p,/glass:'rgba\(18, 16, 28, 0\.72\)'/);
  assert.match(p,/glassBorder:'rgba\(255, 255, 255, 0\.14\)'/);
  assert.match(p,/storyDisplaySize:readonly \[180,220\]/);
  assert.match(p,/storyBrandSize:36;storyOfferSize:84/);
  assert.match(p,/storyServiceSize:32;storyButtonSize:28;storyFooterSize:24/);
  assert.match(p,/glassBlur:24;glassRadius:32;glassBorderWidth:1\.5/);
  assert.match(p,/displayTracking:-0\.02;displayLineHeight:0\.9/);
  assert.match(css,/backdrop-filter:blur\(24px\)/);
  assert.match(css,/border-radius:32px/);
  assert.match(css,/linear-gradient\(90deg,#FF5E00 0%,#FF8A00 100%\)/);
  assert.match(css,/text-shadow:0 0 28px rgba\(255,94,0,\.65\)/);
});
test('premium Canvas renderer draws fonts, glass, CTA, and icon contact rows into exported PNG',()=>{
  const premium=read('lib/marketing/puter-premium-poster-renderer.ts');
  assert.match(premium,/export function renderPremiumPoster/);
  assert.match(compose,/renderPremiumPoster\(\{ctx,image:img,format:input\.format,copy:input\.copy,style:input\.style\}\)/);
  assert.match(premium,/ctx\.filter='blur\('/);
  assert.match(premium,/rgba\(255,94,0,\.55\)/);
  assert.match(premium,/role:'display'/);
  assert.match(premium,/role:'offer'/);
  assert.match(premium,/drawPill/);
  assert.match(premium,/contactIcon/);
  assert.match(premium,/kind:'mail'/);
  assert.match(premium,/kind:'phone'/);
  assert.match(premium,/kind:'globe'/);
  assert.match(premium,/ctx\.fillText/);
  assert.match(premium,/ctx\.canvas\.width/);
  assert.match(premium,/copy\.email\?\.trim\(\)/);
  assert.match(premium,/spelling and content were not changed/);
  assert.match(lab,/email:showEmail\?facts\.email:''/);
  assert.match(lab,/Verified business email/);
  assert.match(lab,/Premium typography preset/);
  assert.match(lab,/typographyPreset\.label/);
  assert.doesNotMatch(premium,/puter\.ai|GEMINI_API_KEY|fetch\(/);
});
test('user requirements win over season and Gemini style, with no model-drawn fake text',()=>{
  const p=read('lib/marketing/poster-premium-presets.ts');
  assert.match(compose,/HIGHEST PRIORITY — USER REQUIREMENTS/);
  assert.match(compose,/SECOND PRIORITY — OUTPUT COMPOSITION/);
  assert.match(compose,/THIRD PRIORITY — STYLE INSPIRATION ONLY/);
  assert.match(compose,/FOURTH PRIORITY — OPTIONAL GEMINI CREATIVE SUGGESTION/);
  assert.ok(compose.indexOf('short(input.request,1200)')<compose.indexOf("short(input.styleDirection||'',700)"));
  assert.match(compose,/No extra pumpkins, moons, trees, fireworks/);
  assert.match(p,/If the owner requested a specific hero/);
  assert.match(compose,/no AI-generated words, letters, numerals/);
  assert.match(lab,/request:prompt\.trim\(\),styleDirection,creativeDirection:briefDirection/);
  assert.match(lab,/setBrief\(null\);setBriefKey\(''\)/);
});
test('reuse Puter login in active SDK session rather than presenting popup every generation',()=>{
  assert.match(lab,/auth:\{signIn:\(\)=>Promise<unknown>;isSignedIn:\(\)=>boolean\}/);
  assert.match(lab,/if\(!puter\.auth\.isSignedIn\(\)\)await puter\.auth\.signIn\(\)/);
});


test('adaptive premium glass card removes the large offer-to-CTA dead zone',async()=>{
  const source=read('lib/marketing/puter-adaptive-card-layout.ts');
  const renderer=read('lib/marketing/puter-premium-poster-renderer.ts');
  assert.match(source,/export function planStackedCard/);
  assert.match(source,/const cardHeight=cursor\+bottomPad/);
  assert.match(source,/const top=bottom-cardHeight/);
  assert.match(source,/ctaOffset=cursor;cursor\+=ctaHeight/);
  assert.match(source,/contactsOffset=cursor;cursor\+=contactsHeight/);
  assert.match(renderer,/const layout=planStackedCard/);
  assert.match(renderer,/y:layout\.ctaY/);
  assert.match(renderer,/y:layout\.contactsY/);
  assert.match(renderer,/glassPanel\(ctx,side,layout\.top,panelW,layout\.height,p,scale\)/);
  assert.doesNotMatch(renderer,/const buttonTop=Math\.max\(y\+22\*scale,contactTop-93\*scale\)/);
  const {planStackedCard}=await import('../lib/marketing/puter-adaptive-card-layout.ts');
  const story=planStackedCard({
    format:'story',canvasHeight:1920,scale:1,brandHeight:43,
    offerHeight:94,serviceHeight:43,hasCta:true,contactRows:3,
  });
  assert.ok(story.top>1920*.65,'short offer card must reveal more of the hero image');
  assert.ok(story.ctaY!==null&&story.serviceY!==null);
  assert.ok(story.contactsY!==null);
  assert.ok(story.ctaY-(story.serviceY+43)<=25,'button follows service rather than bottom pinning');
  assert.ok(story.contactsY-(story.ctaY+story.ctaHeight)<=27,'contacts follow CTA, not separated by a blank panel');
  assert.ok(story.maxContentGap<=26,'no gratuitous internal blank vertical region');
  assert.ok(story.contactsY+story.contactsHeight+25<=story.bottom);
});
test('adaptive card responds to all 3 vertical output sizes, amount of approved text and contacts',async()=>{
  const {planStackedCard}=await import('../lib/marketing/puter-adaptive-card-layout.ts');
  for(const [format,height] of [['story',1920],['portrait',1350],['square',1080]]){
    const scale=height/1920;
    const small=planStackedCard({
      format,canvasHeight:height,scale,brandHeight:40*scale,
      offerHeight:0,serviceHeight:39*scale,hasCta:true,contactRows:1,
    });
    const large=planStackedCard({
      format,canvasHeight:height,scale,brandHeight:40*scale,
      offerHeight:130*scale,serviceHeight:65*scale,hasCta:true,contactRows:3,
    });
    assert.ok(small.top>large.top,format+' shorter content needs a shorter card');
    assert.ok(small.height<large.height);
    assert.ok(small.bottom<=height*.95&&large.bottom<=height*.95);
    assert.ok(small.ctaY>small.serviceY&&large.ctaY>large.serviceY);
    assert.ok(small.contactsY>small.ctaY&&large.contactsY>large.ctaY);
  }
  assert.throws(()=>planStackedCard({
    format:'square',canvasHeight:1080,scale:1080/1920,
    brandHeight:400,offerHeight:400,serviceHeight:300,hasCta:true,contactRows:3,
  }),/Shorten the offer or CTA/);
});
test('premium art prompt protects upper high-quality hero composition and adapts lower panel',()=>{
  assert.match(compose,/USER REQUIREMENTS/);
  assert.match(compose,/MIDDLE 31–67%/);
  assert.match(compose,/COMPACT glass content card/);
  assert.match(compose,/high-fidelity materials/);
  assert.match(compose,/NO TEXT of any kind/);
  assert.match(compose,/No extra pumpkins, moons, trees/);
  const preset=read('lib/marketing/poster-premium-presets.ts');
  assert.match(preset,/HERO SUBJECT in the MIDDLE 31%-67%/);
  assert.match(preset,/LOWER 68%-95% calm for a COMPACT dynamically sized glass card/);
  assert.doesNotMatch(preset,/LOWER 59%-93%/);
});


test('v2 core architecture: owner-verified quota-gated JSON design blueprint is review-only',()=>{
  const brain=read('lib/marketing/poster-gemini-design-blueprint.ts');
  const schema=read('lib/marketing/poster-design-blueprint.ts');
  assert.match(api,/const wantsBlueprint=body\.mode==='blueprint'/);
  assert.match(api,/if\(wantsBlueprint\)\{/);
  assert.match(api,/createGeminiPosterDesignBlueprint\(\{/);
  assert.ok(api.indexOf("admin.rpc('marketing_poster_voice_try_reserve'")<
    api.indexOf('createGeminiPosterDesignBlueprint({'));
  assert.match(api,/reviewBeforeGenerating:true/);
  assert.match(brain,/GEMINI_POSTER_MODEL/);
  assert.match(brain,/responseMimeType:'application\/json'/);
  assert.match(brain,/POSTER_BLUEPRINT_JSON_SCHEMA/);
  assert.match(brain,/validatePosterBlueprint\(JSON\.parse\(raw\)/);
  assert.match(brain,/Do not invent prices, discounts, percentages/);
  assert.match(schema,/export type PosterBlueprint/);
  assert.match(schema,/posterCopy:\{headline:string;offerText:string;ctaText:string\}/);
  assert.match(schema,/imagePrompt:string/);
  assert.match(schema,/export function validatePosterBlueprint/);
  assert.match(lab,/mode:'blueprint',campaignStyle:selectedSuggestionId/);
  assert.match(lab,/setBlueprint\(data\.blueprint\)/);
  assert.match(lab,/Review the headline, exact offer and CTA/);
  assert.doesNotMatch(brain,/marketing_poster_reserve|growth_credits|localStorage/);
});
test('v2 approved Tamil Sinhala English font pairs are safe and actually printed in output PNG',()=>{
  const schema=read('lib/marketing/poster-design-blueprint.ts');
  const presets=read('lib/marketing/poster-premium-presets.ts');
  const renderer=read('lib/marketing/puter-premium-poster-renderer.ts');
  const css=read('app/vendor/marketing/design/puter-lab/typography.css');
  for(const font of ['Noto Sans Tamil','Hind Madurai','Noto Serif Tamil','Mukta Malar','Kavivanar',
    'Noto Sans Sinhala','Gemunu Libre','Abhaya Libre','Anton','Bebas Neue',
    'Montserrat','Poppins','Playfair Display','Plus Jakarta Sans']){
    assert.ok(schema.includes(font),'font allowlist '+font);
    assert.ok(css.includes(font.replaceAll(' ','+')),'Google CSS loaded '+font);
  }
  assert.match(presets,/withVerifiedPosterDesign/);
  assert.match(presets,/POSTER_FONT_PAIRS\[language\]\.some/);
  assert.match(renderer,/p\.font\.scriptHeadline/);
  assert.match(renderer,/p\.font\.scriptBody/);
  assert.match(renderer,/layoutMode:SafeZoneLayout/);
  assert.match(renderer,/p\.overlayGradient==='subtle_vignette'/);
  assert.match(compose,/design\?:VerifiedPosterDesign\|null/);
  assert.match(compose,/style:input\.style,design:input\.design,language:input\.copy\.language/);
  assert.match(lab,/style:selectedPremiumStyle,design:activeDesign/);
});
test('seasonal business action chips never call billable models or start background Gemini requests',()=>{
  const module=read('lib/marketing/poster-design-blueprint.ts');
  assert.match(module,/id:'pongal',label:'Thai Pongal Special'/);
  assert.match(module,/id:'avurudu',label:'Avurudu Offer'/);
  assert.match(module,/id:'vesak',label:'Vesak Campaign'/);
  assert.match(module,/id:'ramadan',label:'Ramadan Greetings'/);
  assert.match(module,/id:'admissions',label:'Admissions Open'/);
  assert.match(module,/id:'christmas',label:'Christmas Offer'/);
  assert.match(module,/id:'blackfriday',label:'Black Friday'/);
  assert.match(module,/id:'delivery',label:'Free Delivery'/);
  assert.match(module,/timeZone:'Asia\/Colombo'/);
  assert.match(lab,/const chooseSuggestion=\(suggestion:/);
  assert.match(lab,/onClick=\{\(\)=>chooseSuggestion\(suggestion\)\}/);
  assert.match(lab,/setSelectedSuggestionId\(suggestion\.id\)/);
  assert.match(lab,/setBlueprint\(null\);setBlueprintKey\(''\)/);
  assert.doesNotMatch(module,/puter\.ai\.txt2img|GEMINI_API_KEY/);
});
test('shuffle and safe-zone positions alter local Canvas only, not user-pay or provider',()=>{
  const module=read('lib/marketing/poster-design-blueprint.ts');
  const renderer=read('lib/marketing/puter-premium-poster-renderer.ts');
  assert.match(module,/export const SAFE_ZONE_LAYOUTS=\['top_center_hero','bottom_left_editorial','split_card'\]/);
  assert.match(module,/export function shufflePosterDesign/);
  assert.match(lab,/Shuffle font & colors/);
  assert.match(lab,/shufflePosterDesign\(activeDesign,language,next,format\)/);
  assert.match(lab,/onChange=\{e=>\{\s*const layout=e\.target\.value as SafeZoneLayout/);
  assert.match(lab,/No image regeneration/);
  assert.match(renderer,/const panelW=layoutMode==='top_center_hero'/);
  assert.match(renderer,/center:layoutMode!=='bottom_left_editorial'/);
  assert.match(lab,/Editing headline, offer, CTA, contact visibility or size rebuilds the PNG locally/);
});
test('Gemini may not hallucinate a vendor percentage or contact and cannot select unknown font URLs',async()=>{
  const {validatePosterBlueprint}=await import('../lib/marketing/poster-design-blueprint.ts');
  const valid={
    posterCopy:{headline:'பொங்கல் ஸ்பெஷல்',offerText:'25% தள்ளுபடி',ctaText:'இன்றே தொடர்பு கொள்ளவும்'},
    styling:{vibe:'festive',headlineFont:'Noto Serif Tamil',bodyFont:'Mukta Malar',
      primaryColor:'#1c2a2a',accentColor:'#FF8000',textColor:'#FFFFFF',overlayGradient:'dark_bottom_top'},
    imagePrompt:'Premium Sri Lankan Thai Pongal harvest photography with an authentic clay pot, rice stalks, gold sunrise and luxurious studio lighting. Leave clean space in the top and lower section for verified text. Preserve authentic local cultural details and a harmonious richly lit hero composition. NO text, NO letters, NO numbers, NO signs, NO logos, pure background artwork only.',
  };
  const request='எங்க கடைக்கு பொங்கல் ஸ்பெஷல் 25% ஆஃபர்';
  const result=validatePosterBlueprint(valid,{language:'ta',vendorPrompt:request});
  assert.equal(result.posterCopy.offerText,'25% தள்ளுபடி');
  assert.equal(result.styling.primaryColor,'#1C2A2A');
  assert.throws(()=>validatePosterBlueprint({...valid,posterCopy:{...valid.posterCopy,offerText:'50% தள்ளுபடி'}},
    {language:'ta',vendorPrompt:request}),/invented or changed a percentage/);
  assert.throws(()=>validatePosterBlueprint({...valid,posterCopy:{...valid.posterCopy,ctaText:'Call 0771234567'}},
    {language:'ta',vendorPrompt:request}),/contact information/);
  assert.throws(()=>validatePosterBlueprint({...valid,styling:{...valid.styling,headlineFont:'https://untrusted.example/evil.woff'}},
    {language:'ta',vendorPrompt:request}),/font not approved/);
});
