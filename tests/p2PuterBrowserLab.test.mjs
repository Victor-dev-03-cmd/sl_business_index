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
  assert.match(lab,/composeExactPoster\(\{backgroundSrc:artworkSrc,format,copy:exactCopy\}\)/);
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
    assert.doesNotMatch(svg,/<image\b|<script\b|http:|https:/);
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
  assert.match(lab,/styleDirection,briefDirection/);
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
