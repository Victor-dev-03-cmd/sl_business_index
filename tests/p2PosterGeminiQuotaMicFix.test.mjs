import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const config=read('next.config.ts');
const poster=read('app/vendor/marketing/design/puter-lab/page.tsx');
const caption=read('app/vendor/marketing/captions/page.tsx');
const engine=read('lib/marketing/voice/slbi-voice-engine.ts');
const api=read('app/api/marketing/poster/puter-lab/route.ts');
const transcription=read('app/api/marketing/poster/transcribe/route.ts');
const sql=read('docs/growth/p2/P2_26_POSTER_QA_GEMINI_SHARED_QUOTA_20261117.sql');

test('microphone remains default-deny outside the two owner-authorized creative tools',()=>{
  assert.match(config,/source: '\/\(\.\*\)'/);
  assert.match(config,/microphone=\(\), geolocation=\(self\)/);
  assert.match(config,/source: '\/vendor\/marketing\/design\/puter-lab'/);
  assert.match(config,/source: '\/vendor\/marketing\/captions'/);
  const captionHeader=config.slice(config.indexOf("source: '/vendor/marketing/captions'"));
  assert.match(captionHeader,/microphone=\(self\)/);
  assert.match(engine,/navigator\.mediaDevices\.getUserMedia\(\{/);
  assert.match(caption,/voicePermissionHelp&&/);
  assert.match(caption,/Site settings, set Microphone to Allow/);
  assert.match(engine,/window\.isSecureContext/);
});

test('only verified internal owner QA gets bounded additional Gemini voice+brief allowance',()=>{
  assert.match(sql,/CHECK \(attempts BETWEEN 0 AND 24\)/);
  assert.match(sql,/v_daily_limit integer:=12/);
  assert.match(sql,/v_daily_limit:=24/);
  assert.match(sql,/payment_reference='SLBI_INTERNAL_QA_NO_PAYMENT_20261114'/);
  assert.match(sql,/e\.verified_at<=now\(\) AND e\.expires_at>now\(\)/);
  assert.match(sql,/SET search_path=''/);
  assert.match(sql,/auth\.role\(\) IS DISTINCT FROM 'service_role'/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.marketing_poster_voice_try_reserve/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.marketing_poster_voice_try_reserve/);
  assert.match(sql,/ON CONFLICT \(user_id,day_utc\) DO UPDATE/);
  assert.doesNotMatch(sql,/UPDATE public\.growth_credit_wallets|UPDATE public\.marketing_poster_voice_quotas SET attempts=0/);
});

test('the owner can see a factual quota without spending model calls on GET',()=>{
  assert.match(api,/const QA_GEMINI_SHARED_DAILY_LIMIT=24/);
  assert.match(api,/sharedGeminiQuota\(userId\)/);
  assert.match(api,/if\(new URL\(request.url\)\.searchParams\.get\('quota'\)==='1'\)/);
  assert.match(api,/\.eq\('user_id',userId\)\.eq\('day_utc',dayUtc\)/);
  assert.match(api,/return reply\(200,\{businesses,quota\}\)/);
  assert.match(api,/isPosterInternalQAAccount\(user.id,client\)/);
  assert.match(api,/marketing_poster_voice_try_reserve/);
  assert.match(transcription,/marketing_poster_voice_try_reserve/);
  assert.match(poster,/Shared Gemini daily quota/);
  assert.match(poster,/refreshGeminiQuota\(\)/);
  assert.match(poster,/Separate from SLBI Growth Credits and Puter image usage/);
});

test('Poster Studio -> Caption Lab retains private final PNG handoff, not automatic provider spending',()=>{
  const handoff=read('lib/marketing/caption-poster-handoff.ts');
  assert.match(poster,/saveLinkedPoster\(\{/);
  assert.match(poster,/Write Caption for this Poster/);
  assert.match(poster,/window\.location\.assign\('\/vendor\/marketing\/captions\?handoff='/);
  assert.match(caption,/loadLinkedPoster\(key\)/);
  assert.match(caption,/businesses\.some\(b=>b\.id===record\.context\.businessId\)/);
  assert.match(handoff,/indexedDB\.open\(DB_NAME,1\)/);
  const link=poster.indexOf('const continueToCaption=async()=>');
  const locked=poster.indexOf('  const locked=',link);
  assert.ok(link>0&&locked>link);
  assert.doesNotMatch(poster.slice(link,locked),/generate\(\)|puter\.ai\.txt2img|Gemini|\/api\/marketing\/caption/);
  assert.match(poster,/realMode&&!consent/);
  assert.match(poster,/test_mode:!realMode/);
});
