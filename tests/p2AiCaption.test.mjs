import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCaptionInput,sanitizeModelCaption,buildCaptionMessages,CAPTION_MODEL,MAX_OUTPUT_TOKENS} from '../lib/marketing/caption-contract.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const good={
  businessId:'11111111-1111-4111-8111-111111111111',
  requestKey:'44444444-4444-4444-8444-444444444444',
  objective:'promotion',language:'ta',
  message:'எங்கள் கடையில் புதிய உணவுப் பொருட்கள் கிடைக்கின்றன.',
  conditions:'Offer valid subject to stock availability.',cta:'Contact our shop.',
};
test('P2-02 caption brief supports Tamil Sinhala English, rejects untrusted fields',()=>{
  for(const language of ['en','ta','si'])assert.equal(validateCaptionInput({...good,language}).ok,true);
  for(const variant of [
    {...good,user_id:'fake'}, {...good,ownerId:'spoof'}, {...good,price:'0'},
    {...good,credits:10000},{...good,providerModel:'unlimited-free'},
    {...good,businessId:'no'}, {...good,requestKey:'bad'},
    {...good,message:'hi'}, {...good,message:'m'.repeat(601)},
    {...good,language:'de'}, {...good,objective:'unlimited'},
  ])assert.equal(validateCaptionInput(variant).ok,false,JSON.stringify(variant).slice(0,80));
});
test('P2-02 prompt only uses actual business context and user supplied brief',()=>{
  const ctx={businessName:'Owned Shop',category:'Retail',city:'Jaffna',
    brandName:'Shop Brand',slogan:'Fresh food',audience:'Local shoppers',
    tone:'friendly',guidelines:'Avoid exaggerated statements'};
  const messages=buildCaptionMessages(ctx,good);
  assert.equal(messages.length,2);
  assert.match(messages[0].content,/only supplied factual business/);
  assert.match(messages[0].content,/Sri Lankan Tamil/);
  assert.match(messages[0].content,/Never invent prices/);
  assert.match(messages[1].content,/Owned Shop/);
  assert.match(messages[1].content,/Local shoppers/);
  assert.match(messages[1].content,/stock availability/);
  assert.doesNotMatch(messages[1].content,/SUPABASE_SECRET|GROQ_API_KEY/);
});
test('Model output is bounded, no JSON-shaped output treated as reviewed caption',()=>{
  assert.equal(sanitizeModelCaption('   Hello!   '),'Hello!');
  for(const v of [null,{},'', 'a','x'.repeat(3001),'{"published":true}'])
    assert.equal(sanitizeModelCaption(v),null);
  assert.equal(CAPTION_MODEL,'openai/gpt-oss-20b');
  assert.ok(MAX_OUTPUT_TOKENS<=512);
});
test('No AI provider call occurs before environment approval and credit reservation',()=>{
  const s=read('app/api/marketing/caption/route.ts');
  const gate=s.indexOf("process.env.SLBI_MARKETING_AI_ENABLED!=='true'");
  const reserve=s.indexOf("admin.rpc('marketing_reserve_ai_draft'");
  const provider=s.indexOf("fetch('https://api.groq.com/openai/v1/chat/completions'");
  assert.ok(gate>0 && reserve>gate && provider>reserve);
  assert.match(s,/auth\.getUser\(\)/);
  assert.match(s,/\.eq\('owner_id',user\.id\)/);
  assert.match(s,/isSameOrigin/);
  assert.match(s,/!reserved\.newly_created/);
  assert.match(s,/admin\.rpc\('marketing_refund_ai_draft'/);
  assert.match(s,/admin\.rpc\('marketing_complete_ai_draft'/);
  assert.match(s,/AbortSignal\.timeout\(18000\)/);
  assert.doesNotMatch(s,/NEXT_PUBLIC_GROQ|apiKey:.*process\.env\.NEXT_PUBLIC/);
});
test('P2-10 database prevents double billing and cross-tenant access with global budget',()=>{
  const s=read('docs/growth/p2/P2_02_P2_10_AI_CREDIT_RESERVATIONS_STAGING_ONLY.sql');
  assert.match(s,/SECURITY DEFINER SET search_path=''/);
  assert.match(s,/auth\.role\(\) IS DISTINCT FROM 'service_role'/);
  assert.match(s,/FOR UPDATE/);
  assert.match(s,/newly_created boolean/);
  assert.match(s,/v_job\.cost_credits,false/);
  assert.match(s,/v_cost,true/);
  assert.match(s,/marketing_refund_ai_draft/);
  assert.match(s,/marketing_ai_daily_limits/);
  assert.match(s,/cardinality|credit_cost/);
  assert.match(s,/ENABLE ROW LEVEL SECURITY/);
  assert.match(s,/REVOKE ALL ON public\.marketing_ai_daily_limits/);
});
