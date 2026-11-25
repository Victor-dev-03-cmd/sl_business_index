import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {inspectWA03BConfig,verifyWA03BChallenge,inspectWA03BInbound} from '../../lib/growth/agent/wa03b-test-webhook.mjs';
const NOW=Date.parse('2026-11-26T00:00:00Z');
const env={
 SLBI_WA_SANDBOX_WEBHOOK_ENABLED:'true',
 SLBI_META_APP_SECRET:'a-very-long-test-only-app-secret-012345',
 SLBI_META_VERIFY_TOKEN:'a-very-long-test-only-verify-token-012345',
 SLBI_WA_IDENTITY_PEPPER:'another-long-test-only-identity-pepper-012345',
 SLBI_WA_TEST_WABA_ID:'123456789012345',
 SLBI_WA_TEST_PHONE_NUMBER_ID:'234567890123456',
};
const sample=(message=true,wrong=false)=>{
 const data={object:'whatsapp_business_account',entry:[{id:env.SLBI_WA_TEST_WABA_ID,changes:[{
  field:'messages',value:{messaging_product:'whatsapp',
   metadata:{phone_number_id:wrong?'999999999999999':env.SLBI_WA_TEST_PHONE_NUMBER_ID},
   ...(message?{messages:[{id:'wamid.HBg1234567890123',type:'text',from:'94770000000',
     timestamp:String(Math.floor(NOW/1000)),text:{body:'private sample'}}]}:{statuses:[]})}
 }]}]};
 return Buffer.from(JSON.stringify(data));
};
const sign=b=>'sha256='+createHmac('sha256',env.SLBI_META_APP_SECRET).update(b).digest('hex');
test('disabled-by-default and partial env configuration never verify',()=>{
 assert.equal(inspectWA03BConfig({}).ready,false);
 assert.equal(verifyWA03BChallenge('?hub.mode=subscribe&hub.challenge=777&hub.verify_token='+env.SLBI_META_VERIFY_TOKEN,{}).ok,false);
 assert.equal(inspectWA03BConfig({...env,SLBI_WA_SANDBOX_WEBHOOK_ENABLED:'false'}).ready,false);
 assert.deepEqual(inspectWA03BConfig(env).missing,[]);
});
test('GET verification allows exact Meta challenge and rejects wrong token',()=>{
 const url='?hub.mode=subscribe&hub.challenge=84751&hub.verify_token='+env.SLBI_META_VERIFY_TOKEN;
 assert.deepEqual(verifyWA03BChallenge(url,env),{ok:true,challenge:'84751'});
 assert.equal(verifyWA03BChallenge(url+'&hub.challenge=other',env).ok,false);
 assert.equal(verifyWA03BChallenge(url.replace(env.SLBI_META_VERIFY_TOKEN,'wrong'),env).ok,false);
});
test('Meta six-key dotted + underscore challenge mirrors are verified exactly',()=>{
 const token=env.SLBI_META_VERIFY_TOKEN;
 const canonical='hub.mode=subscribe&hub.challenge=1871474949&hub.verify_token='+token;
 const mirror='hub_mode=subscribe&hub_challenge=1871474949&hub_verify_token='+token;
 assert.deepEqual(verifyWA03BChallenge('?'+canonical+'&'+mirror,env),
  {ok:true,challenge:'1871474949'});
 assert.deepEqual(verifyWA03BChallenge('?'+mirror,env),
  {ok:true,challenge:'1871474949'});
 assert.equal(verifyWA03BChallenge('?'+canonical+'&hub_mode=subscribe',env).ok,false);
 assert.equal(verifyWA03BChallenge('?'+canonical+'&'+mirror+'&hub.mode=subscribe',env).ok,false);
 assert.equal(verifyWA03BChallenge('?'+canonical+'&'+mirror+'&extra=value',env).ok,false);
 assert.equal(verifyWA03BChallenge('?'+canonical+'&'+mirror.replace('hub_challenge=1871474949','hub_challenge=other'),env).ok,false);
 assert.equal(verifyWA03BChallenge('?'+canonical+'&'+mirror.replace(token,'wrong'),env).ok,false);
 assert.equal(verifyWA03BChallenge('?'+canonical+'&'+mirror.replace('hub_mode=subscribe','hub_mode=unsubscribe'),env).ok,false);
 assert.equal(verifyWA03BChallenge('?'+canonical.replace(token,'wrong')+'&'+mirror.replace(token,'wrong'),env).ok,false);
});
test('POST signed incoming event accepted as fingerprint count ONLY, not stored',()=>{
 const body=sample(),r=inspectWA03BInbound(body,sign(body),env,NOW);
 assert.equal(r.ok,true);assert.equal(r.eventCount,1);
 assert.equal(r.messageStored,false);assert.equal(r.businessLinked,false);
 assert.equal(JSON.stringify(r).includes('private sample'),false);
 assert.equal(JSON.stringify(r).includes('94770000000'),false);
});
test('tampering, wrong WABA phone, status-only events and oversized body',()=>{
 const raw=sample();
 assert.equal(inspectWA03BInbound(Buffer.concat([raw,Buffer.from(' ')]),sign(raw),env,NOW).ok,false);
 assert.equal(inspectWA03BInbound(raw,'sha256='+('a'.repeat(64)),env,NOW).ok,false);
 const wrong=sample(true,true);
 assert.equal(inspectWA03BInbound(wrong,sign(wrong),env,NOW).ok,false);
 const status=sample(false);
 assert.equal(inspectWA03BInbound(status,sign(status),env,NOW).eventCount,0);
 const large=Buffer.alloc(262145,97);
 assert.equal(inspectWA03BInbound(large,sign(large),env,NOW).ok,false);
});
test('POST reject diagnostics are bounded categories, never user content',()=>{
 const raw=sample();
 const tampered=inspectWA03BInbound(raw,'sha256='+('0'.repeat(64)),env,NOW);
 assert.equal(tampered.code,'signature_invalid');
 const malformed=Buffer.from('not JSON');
 assert.equal(inspectWA03BInbound(malformed,sign(malformed),env,NOW).code,'payload_invalid');
 const wrong=sample(true,true);
 assert.equal(inspectWA03BInbound(wrong,sign(wrong),env,NOW).code,'unexpected_number');
 const missing=inspectWA03BInbound(raw,sign(raw),{...env,SLBI_WA_SANDBOX_WEBHOOK_ENABLED:'false'},NOW);
 assert.equal(missing.code,'disabled');
 assert.equal(JSON.stringify([tampered,missing]).includes('private sample'),false);
});
test('Next route is no-store, signs before accepting and never logs raw payload',()=>{
 const src=readFileSync(new URL('../../app/api/integrations/whatsapp/webhook/route.ts',import.meta.url),'utf8');
 assert.match(src,/inspectWA03BInbound/);
 assert.match(src,/x-hub-signature-256/);
 assert.match(src,/Cache-Control/);
 assert.match(src,/SLBI WA sandbox webhook POST rejected:/);
 assert.doesNotMatch(src,/console\.warn\([^;]*raw|console\.warn\([^;]*signature|console\.warn\([^;]*body/);
 assert.match(src,/body\.byteLength>262144/);
 assert.doesNotMatch(src,/console\.log|console\.error|fetch\(|\.insert\(|\.upsert\(|\.update\(/);
});
