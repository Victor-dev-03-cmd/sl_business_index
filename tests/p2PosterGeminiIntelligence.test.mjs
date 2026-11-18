import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const brain=read('lib/marketing/poster-gemini-intelligence.ts');
const generate=read('app/api/marketing/poster/generate/route.ts');
const transcribe=read('app/api/marketing/poster/transcribe/route.ts');
const voiceProvider=read('lib/marketing/voice/slbi-gemini-transcription.ts');
const voiceSql=read('supabase/migrations/20261115094500_p2_poster_gemini_voice_quota.sql');

test('Gemini engine uses server-only key, structured output, current Flash-Lite model',()=>{
  assert.match(brain,/import 'server-only'/);
  assert.match(brain,/process\.env\.GEMINI_API_KEY/);
  assert.match(brain,/SLBI_POSTER_PROMPT_AI_ENABLED/);
  assert.match(brain,/gemini-3\.5-flash-lite/);
  assert.match(brain,/responseMimeType:'application\/json'/);
  assert.match(brain,/JSON\.stringify\(schema\)/);
  assert.doesNotMatch(brain,/responseJsonSchema:schema/);
  assert.match(brain,/Poster Gemini prompt upstream HTTP failure/);
  assert.match(brain,/x-goog-api-key/);
  assert.match(brain,/AbortSignal\.timeout/);
  assert.match(brain,/PosterIntelligenceError/);
  assert.doesNotMatch(brain,/NEXT_PUBLIC_GEMINI/);
  assert.doesNotMatch(brain,/console\.log\(/);
});

test('selected public business facts are bounded and private metadata never goes to Gemini',()=>{
  for(const field of ['name','category','description','city','address',
    'phone','email','website_url','brand_name','slogan','primary_color','accent_color','tone']){
    assert.ok(brain.includes(field),'missing published field '+field);
  }
  assert.match(brain,/preparePosterBusinessFacts/);
  assert.match(brain,/Never|never/);
  assert.doesNotMatch(brain,/business\.admin_notes|business\.owner_name|business\.registration_number/);
  assert.doesNotMatch(brain,/process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(brain,/originalUserMessage:request/);
  assert.match(brain,/owner-verified|owner-verified public listing|owner-verified business listing/i);
});

test('Gemini structured response cannot replace authoritative contact details or image provider config',()=>{
  assert.match(brain,/validatedBrief/);
  assert.match(brain,/allowed|excludedConcepts/);
  assert.match(brain,/translatedUserIntent/);
  assert.match(brain,/creativeDirectionEnglish/);
  assert.match(brain,/rawUserRequest/);
  assert.match(brain,/OWNER-VERIFIED SELECTED BUSINESS/);
  assert.match(brain,/input\.facts\.phone/);
  assert.match(brain,/input\.facts\.email/);
  assert.match(brain,/input\.facts\.website/);
  assert.match(brain,/Do not make up numerical discounts/);
  assert.match(brain,/original user message|ORIGINAL USER REQUEST/i);
  assert.match(brain,/input\.isEdit/);
  assert.match(brain,/Preferred poster COPY language: /);
  assert.match(brain,/input\.preferredLanguage/);
  assert.match(generate,/preferredLanguage:checked\.value\.language/);
  assert.doesNotMatch(brain,/GEMINI_API_KEY\s*=\s*['"]/);
});

test('generation validates specific owner business before Gemini, reserves credits first and refunds errors',()=>{
  const ownership=generate.indexOf(".eq('owner_id',user.id)");
  const facts=generate.indexOf('preparePosterBusinessFacts(business,brand)');
  const reservation=generate.indexOf("admin.rpc('marketing_poster_reserve'");
  const gemini=generate.indexOf('createGeminiPosterBrief({');
  const model=generate.indexOf('generatePosterProviderImage({');
  assert.ok(ownership>0&&facts>ownership);
  assert.ok(reservation>facts);
  assert.ok(gemini>reservation);
  assert.ok(model>gemini);
  assert.match(generate,/description,phone,email,address,detailed_address,city,website_url/);
  assert.match(generate,/\.eq\('business_id',business\.id\)/);
  assert.match(generate,/source\.storage_path!==expected/);
  assert.match(generate,/marketing_poster_refund/);
  assert.match(generate,/originalRequest:checked\.value\.subject/);
  assert.match(generate,/isPosterIntelligenceEnabled/);
  assert.match(generate,/GEMINI_POSTER_SCHEMA_VERSION/);
  assert.match(generate,/geminiFault/);
});

test('voice endpoint is private, origin-gated, owner-bound and transcript-only',()=>{
  assert.match(transcribe,/import 'server-only'/);
  assert.match(transcribe,/isSameOrigin/);
  assert.match(transcribe,/isPosterIntelligenceEnabled/);
  assert.match(transcribe,/getMarketingAccessForUser/);
  assert.match(transcribe,/\.eq\('owner_id',user\.id\)/);
  assert.match(transcribe,/MIME_TYPES\.has\(mime\)/);
  assert.match(transcribe,/MAX_AUDIO_BYTES=1_500_000/);
  assert.match(voiceProvider,/SLBI_TRANSCRIPT_MAX_CHARS=12_000/);
  assert.match(voiceProvider,/maxOutputTokens:4096/);
  assert.match(transcribe,/marketing_poster_voice_try_reserve/);
  assert.match(voiceProvider,/inlineData:\{mimeType:input.mime/);
  assert.match(voiceProvider,/VOICE_PROVIDER_QUOTA/);
  assert.match(transcribe,/reviewBeforeGenerating:true/);
  assert.doesNotMatch(transcribe,/marketing_poster_complete|marketing_poster_claim|generatePosterProviderImage/);
  assert.doesNotMatch(transcribe,/storage\.from\(|console\.log|NEXT_PUBLIC_GEMINI/);
});

test('voice daily quota uses service-only atomic count and strict RLS',()=>{
  assert.match(voiceSql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(voiceSql,/marketing_poster_voice_try_reserve/);
  assert.match(voiceSql,/SECURITY DEFINER/);
  assert.match(voiceSql,/SET search_path=public,pg_temp/);
  assert.match(voiceSql,/ON CONFLICT\(user_id,day_utc\) DO UPDATE/);
  assert.match(voiceSql,/attempts<12/);
  assert.match(voiceSql,/REVOKE ALL ON FUNCTION public\.marketing_poster_voice_try_reserve/);
  assert.match(voiceSql,/TO service_role/);
  assert.doesNotMatch(voiceSql,/GRANT (EXECUTE|SELECT|INSERT) .* TO authenticated/);
});

test('legacy Cloudflare adapter remains independently protected while retired UI is absent',()=>{
  const provider=read('lib/marketing/poster-image-provider.ts');
  const ui=read('app/vendor/marketing/design/puter-lab/page.tsx');
  assert.match(provider,/@cf\/black-forest-labs\/flux-2-klein-4b/);
  assert.equal(existsSync(new URL('../app/vendor/marketing/design/page.tsx',import.meta.url)),false);
  assert.match(ui,/SLBI AI Poster Studio/);
  assert.match(ui,/Prepare with Gemini/);
  assert.match(ui,/composeExactPoster/);
  assert.doesNotMatch(ui,/drawPoster\(/);
});
