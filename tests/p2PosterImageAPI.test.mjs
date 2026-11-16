import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('docs/growth/p2/P2_04_POSTER_IMAGE_AI_STAGING_ONLY.sql');
const generate=read('app/api/marketing/poster/generate/route.ts');
const providers=read('lib/marketing/poster-image-provider.ts');
const artwork=read('app/api/marketing/poster/artwork/route.ts');
const editor=read('app/vendor/marketing/design/puter-lab/page.tsx');

test('image spending cannot turn on without explicit action and zero-default cap approval',()=>{
  assert.match(sql,/VALUES\('ai_poster_design',8,false\)/);
  assert.match(sql,/max_attempts integer NOT NULL DEFAULT 0/);
  assert.match(sql,/e\.plan_name IN \('Professional','Enterprise'\)/);
  assert.match(sql,/b\.id=p_business_id AND b\.owner_id=p_user_id/);
  assert.match(sql,/v_cost<>p_expected_credits/);
  assert.match(sql,/IF v_global\.attempts>=v_global\.max_attempts/);
  assert.match(sql,/UNIQUE\(user_id,request_key\)/);
  assert.match(sql,/marketing_poster_claim/);
  assert.match(sql,/marketing_poster_refund/);
  assert.match(sql,/WITH CHECK|FOR SELECT TO authenticated/);
  assert.doesNotMatch(sql,/GRANT INSERT ON public\.marketing_poster_jobs TO authenticated/);
});
test('image endpoint is server-only, Pro owner/RLS-gated, fully cost-reserved and idempotent',()=>{
  assert.match(generate,/SLBI_POSTER_IMAGE_AI_ENABLED/);
  assert.match(generate,/getPosterImageProvider/);
  assert.match(providers,/process\.env\.OPENAI_API_KEY/);
  assert.match(providers,/process\.env\.HF_TOKEN/);
  assert.match(generate,/getMarketingAccessForUser/);
  assert.match(generate,/isSameOrigin/);
  assert.match(generate,/\.eq\('owner_id',user\.id\)/);
  assert.match(generate,/marketing_poster_reserve/);
  assert.match(generate,/p_expected_credits/);
  assert.match(generate,/marketing_poster_claim/);
  assert.match(generate,/marketing_poster_complete/);
  assert.match(generate,/marketing_poster_refund/);
  assert.match(generate,/newly_created/);
  assert.match(providers,/SLBI_POSTER_IMAGE_MODEL/);
  assert.match(providers,/SLBI_POSTER_IMAGE_PROVIDER/);
  assert.match(providers,/\bn:1\b/);
  assert.match(providers,/https:\/\/api\.openai\.com\/v1\/images\/generations/);
  assert.match(providers,/quality:'high'/);
  assert.match(generate,/private/);
  assert.doesNotMatch(generate,/NEXT_PUBLIC_OPENAI_API_KEY/);
  assert.doesNotMatch(generate,/process\.env\.OPENAI_API_KEY\s*\|\|\s*['"]/);
});
test('private image download cannot disclose cross-tenant artwork',()=>{
  assert.match(artwork,/getMarketingAccessForUser/);
  assert.match(artwork,/marketing_poster_jobs/);
  assert.match(artwork,/\.eq\('user_id',user\.id\)/);
  assert.match(artwork,/\.eq\('id',jobId\)/);
  assert.match(artwork,/job\.storage_path!==expected/);
  assert.match(artwork,/admin\.storage\.from\(BUCKET\)\.download/);
  assert.match(artwork,/private, no-store/);
  assert.doesNotMatch(artwork,/createSignedUrl/);
});
test('current Studio uses explicit Puter User-Pays consent, while retired Cloudflare API stays independently guarded',()=>{
  assert.match(editor,/realMode&&!consent/);
  assert.match(editor,/test_mode:!realMode/);
  assert.match(editor,/I understand this uses my Puter AI balance and may create a charge/);
  assert.match(editor,/puter\.ai\.txt2img\(creative,options\)/);
  assert.match(editor,/finalBlob/);
  assert.match(editor,/URL\.createObjectURL/);
  assert.match(editor,/composeExactPoster/);
  assert.match(read('app/vendor/marketing/design/layout.tsx'),/MarketingProOnly/);
  const newOwner=read('app/vendor/marketing/design/puter-lab/layout.tsx');
  assert.match(newOwner,/isPosterInternalQAAccount/);
});

test('real artwork capability is verified server-side, not inferred from a visible browser button',()=>{
  const status=read('app/api/marketing/poster/capabilities/route.ts');
  assert.match(status,/getMarketingAccessForUser/);
  assert.match(status,/SLBI_POSTER_IMAGE_AI_ENABLED/);
  assert.match(status,/getPosterImageProvider/);
  assert.match(status,/marketing_poster_daily_limits/);
  assert.match(status,/ai_poster_design/);
  assert.match(status,/slbi-poster-ai-private/);
  assert.match(status,/available:false/);
  assert.doesNotMatch(status,/NEXT_PUBLIC_OPENAI_API_KEY/);
  assert.match(providers,/gpt-image-2\.6-sunburst/);
  assert.match(providers,/gpt-image-2\.6-flare/);
});

test('Hugging Face provider adapter cannot spend merely because HF_TOKEN is configured',()=>{
  assert.match(providers,/SLBI_POSTER_IMAGE_PROVIDER/);
  assert.match(providers,/provider==='huggingface'/);
  assert.match(providers,/process\.env\.HF_TOKEN/);
  assert.match(providers,/black-forest-labs\/FLUX\.1-schnell/);
  assert.doesNotMatch(providers,/FLUX\.1-dev/);
  assert.match(providers,/router\.huggingface\.co\/fal-ai/);
  assert.match(providers,/num_inference_steps:4/);
  assert.match(providers,/enable_safety_checker:true/);
  assert.match(providers,/status'\+queueQuery/);
  assert.match(providers,/redirect:'error'/);
  assert.match(providers,/\.endsWith\('\.fal\.media'\)/);
  assert.match(generate,/marketing_poster_reserve/);
  assert.match(generate,/marketing_poster_claim/);
  assert.match(generate,/generatePosterProviderImage/);
  assert.match(generate,/marketing_poster_refund/);
  assert.match(sql,/black-forest-labs\/FLUX\.1-schnell/);
  assert.match(sql,/max_attempts integer NOT NULL DEFAULT 0/);
  assert.doesNotMatch(providers,/NEXT_PUBLIC_HF_TOKEN/);
});

test('first-time vendor without optional Brand Kit is not blocked from premium creative brief',()=>{
  const generation=read('app/api/marketing/poster/generate/route.ts');
  const prompt=read('app/api/marketing/poster/prompt/route.ts');
  assert.match(generation,/brand\?\.brand_name\|\|business\.name/);
  assert.match(generation,/owned business/);
  assert.doesNotMatch(generation,/Set up your business Brand Kit before creating AI artwork/);
  assert.doesNotMatch(prompt,/Complete the business Brand Kit before using AI art direction/);
  assert.match(prompt,/brand\?\.brand_name\|\|business\.name/);
});

test('FLUX text-to-image uses official synchronous Fal task, not missing queue request ID',()=>{
  assert.match(providers,/HF_ROUTER\+'fal-ai\/flux\/schnell'/);
  assert.match(providers,/const payload=await response\.json/);
  assert.match(providers,/payload\.images\?\.\[0\]\?\.url/);
  assert.doesNotMatch(providers,/queueUrl=HF_ROUTER\+providerPath/);
  assert.match(providers,/requireProviderOk\(response\.status\)/);
  assert.match(providers,/PosterProviderFailure/);
});
test('private image-to-image edits preserve source ownership and send the real image to Qwen',()=>{
  assert.match(generate,/sourceJobId/);
  assert.match(generate,/editInstruction/);
  assert.match(generate,/\.eq\('user_id',user\.id\)/);
  assert.match(generate,/\.eq\('business_id',business\.id\)/);
  assert.match(generate,/source\.state!=='completed'/);
  assert.match(generate,/source\.storage_path!==expected/);
  assert.match(generate,/sourceImage=Buffer\.from/);
  assert.match(generate,/operationModel=getPosterOperationModel/);
  assert.match(providers,/Qwen\/Qwen-Image-Edit-2509/);
  assert.match(providers,/image_urls:/);
  assert.match(providers,/source\.toString\('base64'\)/);
  assert.match(providers,/redirect:'error'/);
  assert.match(generate,/marketing_poster_refund/);
});

test('Cloudflare Workers AI adapter uses commercial FLUX.2 Klein 4B with strict server secrets',()=>{
  const model='@cf/black-forest-labs/flux-2-klein-4b';
  const migration=read('supabase/migrations/20261115091000_p2_cloudflare_flux2_klein4b_model_allowlist.sql');
  assert.ok(providers.includes(model));
  assert.match(providers,/provider==='cloudflare'/);
  assert.match(providers,/process\.env\.CLOUDFLARE_ACCOUNT_ID/);
  assert.match(providers,/process\.env\.CLOUDFLARE_API_TOKEN/);
  assert.match(providers,/api\.cloudflare\.com\/client\/v4\/accounts/);
  assert.match(providers,/new FormData\(\)/);
  assert.match(providers,/form\.set\('prompt'/);
  assert.match(providers,/form\.set\('width'/);
  assert.match(providers,/form\.set\('height'/);
  assert.match(providers,/form\.set\('input_image_0'/);
  assert.match(providers,/\.resize\(480,480/);
  assert.match(providers,/payload\.result\?\.image/);
  assert.match(providers,/AbortSignal\.timeout/);
  assert.match(providers,/redirect:'error'/);
  assert.match(providers,/MAX_BYTES/);
  assert.match(migration,/flux-2-klein-4b/);
  assert.match(migration,/REVOKE ALL ON FUNCTION public\.marketing_poster_complete/);
  assert.doesNotMatch(providers,/NEXT_PUBLIC_CLOUDFLARE/);
  assert.doesNotMatch(providers,/fetch\(.*request\..*url/);
});
