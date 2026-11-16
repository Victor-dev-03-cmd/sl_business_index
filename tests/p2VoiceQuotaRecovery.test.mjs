import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=read('next.config.ts');
const poster=read('app/vendor/marketing/design/puter-lab/page.tsx');
const captions=read('app/vendor/marketing/captions/page.tsx');
const transcribe=read('app/api/marketing/poster/transcribe/route.ts');
const prepare=read('app/api/marketing/poster/puter-lab/route.ts');
const quota=read('supabase/migrations/20261116192500_p2_internal_qa_voice_brief_quota_override.sql');

test('microphone is allowed only on direct Poster Studio and Caption Lab routes',()=>{
  assert.match(config,/source: '\/\(\.\*\)'/);
  assert.match(config,/value: 'camera=\(\), microphone=\(\), geolocation=\(self\)'/);
  assert.match(config,/source: '\/vendor\/marketing\/design\/puter-lab'/);
  assert.match(config,/source: '\/vendor\/marketing\/captions'/);
  assert.equal((config.match(/microphone=\(self\)/g)||[]).length,2);
  assert.match(config,/camera=\(\), microphone=\(self\), geolocation=\(self\)/);
});

test('Caption voice controls allow Stop during recording, and recovering blocked prompts',()=>{
  assert.match(captions,/onClick=\{\(\)=>recording\?stopVoice\(\):void startVoice\(\)\}/);
  assert.match(captions,/disabled=\{busy\|\|voiceBusy\|\|saving\|\|posterBusy\|\|!businessId\}/);
  assert.doesNotMatch(captions,/disabled=\{isBusy\|\|!businessId\}\s*onClick=\{\(\)=>recording/);
  assert.match(captions,/window\.isSecureContext/);
  assert.match(captions,/permissionsPolicy\?\.allowsFeature\('microphone'\)/);
  assert.match(captions,/navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\)/);
  assert.match(captions,/name==='NotAllowedError'/);
  assert.match(captions,/Site settings → Microphone → Allow/);
  assert.match(captions,/Retry microphone/);
  assert.match(captions,/recorder\.stop\(\)/);
  assert.match(captions,/\/api\/marketing\/poster\/transcribe/);
});

test('Poster Studio records until manual stop and displays permission recovery and remaining quota',()=>{
  assert.match(poster,/navigator\.mediaDevices\.getUserMedia\(\{audio:true\}\)/);
  assert.match(poster,/if\(recording\)\{stopVoice\(\);return;\}/);
  assert.match(poster,/name==='NotAllowedError'/);
  assert.match(poster,/Retry microphone/);
  assert.match(poster,/Site settings → Microphone → Allow/);
  assert.match(poster,/Gemini Voice \+ Brief/);
  assert.match(poster,/voiceQuota\.remaining/);
  assert.match(poster,/const refreshVoiceQuota=useCallback/);
  assert.match(poster,/finally\{setGeminiBusy\(false\);void refreshVoiceQuota\(\);\}/);
  assert.match(poster,/test_mode:!realMode/);
  assert.match(poster,/realMode&&!consent/);
  assert.match(poster,/saveLinkedPoster\(\{/);
  assert.match(poster,/window\.location\.assign\('\/vendor\/marketing\/captions\?handoff='/);
});

test('Shared Gemini voice/brief status is authenticated and does not spend quota',()=>{
  const start=transcribe.indexOf('export async function GET()');
  const end=transcribe.indexOf('export async function POST(',start);
  assert.ok(start>0&&end>start);
  const getter=transcribe.slice(start,end);
  assert.match(getter,/auth\.getUser\(\)/);
  assert.match(getter,/rejectMarketingAccess/);
  assert.match(getter,/\.eq\('user_id',user\.id\)/);
  assert.match(getter,/\.eq\('day_utc',day\)/);
  assert.match(getter,/return reply\(200,\{quota:\{used,limit,remaining:/);
  assert.doesNotMatch(getter,/marketing_poster_voice_try_reserve|generateContent|transcribe audio|POST/);
  const post=transcribe.slice(end);
  assert.match(post,/marketing_poster_voice_try_reserve/);
  assert.match(post,/getMarketingAccessForUser/);
  assert.match(post,/\.eq\('owner_id',user\.id\)/);
  assert.match(prepare,/marketing_poster_voice_try_reserve/);
});

test('One-day QA extension is atomic, never increases wallets, protects all other users',()=>{
  assert.match(quota,/ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 12/);
  assert.match(quota,/CHECK \(attempts BETWEEN 0 AND 18 AND attempts <= max_attempts\)/);
  assert.match(quota,/CHECK \(max_attempts BETWEEN 0 AND 18\)/);
  assert.match(quota,/auth\.role\(\) IS DISTINCT FROM 'service_role'/);
  assert.match(quota,/WHERE public\.marketing_poster_voice_quotas\.attempts </);
  assert.match(quota,/public\.marketing_poster_voice_quotas\.max_attempts/);
  assert.match(quota,/payment_reference='SLBI_INTERNAL_QA_NO_PAYMENT_20261114'/);
  assert.match(quota,/q\.day_utc=DATE '2026-11-16'/);
  assert.match(quota,/SET max_attempts=18/);
  assert.match(quota,/REVOKE ALL ON FUNCTION public\.marketing_poster_voice_try_reserve/);
  assert.match(quota,/REVOKE ALL ON public\.marketing_poster_voice_quotas FROM PUBLIC,anon,authenticated/);
  assert.doesNotMatch(quota,/growth_credit_wallets|INSERT INTO public\.growth_credit_ledger/);
  assert.doesNotMatch(quota,/DROP TABLE|DISABLE ROW LEVEL SECURITY|GRANT EXECUTE.*authenticated/);
});
