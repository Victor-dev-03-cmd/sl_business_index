import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describePuterImageError} from '../lib/marketing/puter-image-errors.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const lab=read('app/vendor/marketing/design/puter-lab/page.tsx');
const presets=read('lib/marketing/poster-reference-library.ts');

test('Puter SDK object errors reveal actionable auth, funds, upstream and model guidance',()=>{
  const cases=[
    [{error:'popup_blocked',msg:'popup denied'},'sign_in','popup'],
    [{error:'auth_window_closed',msg:'Closed window'},'sign_in','cancelled'],
    [{code:'insufficient_funds',message:'balance too low'},'image_request','AI balance'],
    [{code:'upstream_failed',message:'Generation failed'},'image_request','image provider or network'],
    [{code:'bad_request',message:'Model rejected this ratio'},'image_request','settings'],
    [{code:'bad_request',errorCode:'moderation_flagged',message:'Rejected'},'image_request','did not allow'],
    [{error:{code:'rate_limited',message:'Limit'}},'image_request','rate-limited'],
    [{error:'unsupported_origin',msg:'Invalid origin'},'sign_in','website origin'],
    [new Error('Network request failed'),'image_request','network'],
  ];
  for(const [error,stage,expect] of cases){
    const result=describePuterImageError(error,stage);
    assert.match(result.message,new RegExp(String(expect),'i'));
    assert.ok(result.code.length>0);
    assert.doesNotMatch(result.message,/The requested action failed/i);
  }
});

test('unknown provider errors avoid leaking raw untrusted payloads and never instruct paid auto retry',()=>{
  const secret='sk-test-very-private-random-token';
  const value={message:'service failed; token='+secret,stack:'verbose',headers:{Authorization:secret}};
  const result=describePuterImageError(value,'image_request');
  assert.equal(result.code,'unknown_provider_error');
  assert.match(result.message,/provider could not complete generation/);
  assert.doesNotMatch(result.message,/sk-test|Authorization|token=/);
  assert.match(result.message,/No automatic paid retry was made/);
  assert.match(describePuterImageError(null,'sign_in').message,/Puter sign-in/);
  assert.match(describePuterImageError({},'sample_preview').message,/local SLBI reference/);
});

test('sample mode falls back to an original local SLBI PNG without billing or masquerading as AI',()=>{
  assert.match(lab,/const loadLocalPosterSample=async\(reason:string\)=>/);
  assert.match(lab,/getPosterReferenceStyle\('tech'\)/);
  assert.match(lab,/originalReferencePng\(thumbnail\)/);
  assert.match(lab,/sampleArtworkUrlRef\.current=url/);
  assert.match(lab,/setIsRealOutput\(false\)/);
  assert.match(lab,/It is not AI-generated artwork/);
  assert.match(lab,/if\(!realMode&&\(!sdkReady\|\|!puter\|\|!puter\.auth\.isSignedIn\(\)\)\)/);
  assert.match(lab,/if\(!realMode\)\{\s*try\{\s*await loadLocalPosterSample/);
  assert.match(lab,/if\(previous\)URL\.revokeObjectURL\(previous\)/);
  assert.match(lab,/URL\.revokeObjectURL\(sampleArtworkUrlRef\.current\)/);
  assert.match(presets,/id:'tech',name:'Modern Tech',thumbnail:'\/poster-references\/tech\.svg'/);
  assert.match(lab,/test_mode:!realMode/);
});

test('real image generation remains single paid user action with consent, no automatic model switching',()=>{
  assert.match(lab,/if\(realMode&&!consent\)/);
  assert.match(lab,/if\(!puter\.auth\.isSignedIn\(\)\)await puter\.auth\.signIn\(\)/);
  assert.match(lab,/const image=await puter\.ai\.txt2img\(creative,options\)/);
  assert.match(lab,/phase='image_request'/);
  assert.match(lab,/describePuterImageError\(e,phase\)/);
  assert.match(lab,/setGenerationStage\('error'\);setError\(detail\.message/);
  assert.match(lab,/No automatic paid retry was made/);
  assert.match(lab,/realMode\?'Generate with SLBI Image Generator':'Preview poster sample'/);
  const generation=lab.slice(lab.indexOf('  const generate=async()=>{'),lab.indexOf('  const download=()=>{'));
  assert.equal((generation.match(/puter\.ai\.txt2img\(/g)||[]).length,1);
  assert.doesNotMatch(generation,/while\s*\(|for\s*\(.*model|Promise\.all\(\[.*txt2img/);
  assert.doesNotMatch(generation,/admin\.rpc|marketing_poster_reserve|growth_credit_wallet/);
});

test('unknown error no longer depends on Error instanceof alone',()=>{
  const helper=read('lib/marketing/puter-image-errors.ts');
  assert.match(helper,/root\.errorCode/);
  assert.match(helper,/root\.code/);
  assert.match(helper,/root\.msg/);
  assert.match(helper,/root\.message/);
  assert.match(helper,/nested\?\.message/);
  assert.match(lab,/import \{describePuterImageError\} from '@\/lib\/marketing\/puter-image-errors'/);
});
