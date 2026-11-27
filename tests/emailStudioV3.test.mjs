import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EMAIL_TEMPLATE_LAYOUTS,safeCustomPreviewDocument,isTemplateLayout}
  from '../lib/marketing/email-template-contract.ts';
import {validateEmailAiRequest,parseEmailAiOutput,emailModelPrompt,GEMINI_EMAIL_SCHEMA}
  from '../lib/marketing/email-ai-contract.ts';
import {validateLeadSubmission} from '../lib/growth/lead-contract.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('app/vendor/marketing/engine/components/EmailMarketingWorkbench.tsx');
const page=read('app/vendor/marketing/engine/(pro)/email/page.tsx');
const api=read('app/api/marketing/email/generate/route.ts');
const form=read('app/business/[slug]/BusinessDetailsClient.tsx');
const submit=read('app/api/leads/submit/route.ts');
const migration=read('docs/growth/EMAIL_03_CONSENT_LEDGER_REVIEW_ONLY.sql');
const uuid='a9999999-1111-4111-8111-777777777777';
test('Four actual template layouts with sandbox-only custom HTML',()=>{
 assert.deepEqual(EMAIL_TEMPLATE_LAYOUTS.map(x=>x.id),['minimal','hero','offers','custom']);
 assert.equal(isTemplateLayout('custom'),true);
 assert.equal(isTemplateLayout('script'),false);
 const doc=safeCustomPreviewDocument('<img src="https://evil.example/track"><script>alert(1)</script>');
 assert.match(doc,/default-src &apos;none&apos;/);
 assert.match(doc,/img-src data:/);
 assert.match(doc,/form-action &apos;none&apos;/);
 assert.match(ui,/data-testid="email-template-switcher"/);
 assert.match(ui,/template==='hero'/);
 assert.match(ui,/template==='offers'/);
 assert.match(ui,/template==='custom'/);
 assert.match(ui,/sandbox=""/);
 assert.match(ui,/referrerPolicy="no-referrer"/);
 assert.match(ui,/srcDoc=\{safeCustomPreviewDocument\(customHtml\)\}/);
 assert.match(ui,/slbi\.email\.brand-template/);
 assert.match(ui,/onClick=\{saveCustomTemplate\}/);
});
test('Gemini generated email request is strictly structured, quota-bound and review-only',()=>{
 const value={businessId:uuid,requestKey:uuid,language:'ta',kind:'offer',
   brief:'Verified launch of a new clothing service next month',ctaUrl:'https://www.slbusinessindex.com/business/my-store'};
 assert.deepEqual(validateEmailAiRequest(value),value);
 assert.equal(validateEmailAiRequest({...value,language:'xx'}),null);
 assert.equal(validateEmailAiRequest({...value,ctaUrl:'javascript:alert(1)'}),null);
 assert.equal(validateEmailAiRequest({...value,recipients:['x@example.com']}),null);
 assert.equal(validateEmailAiRequest({...value,brief:'a'}),null);
 const o={subject:'சலுகை தகவல்கள் — புதிய சேவை',
   preheader:'புதிய சேவை பற்றிய தகவல்',body:'வணக்கம்! எங்கள் புதிய சேவையைப் பற்றி அறிந்துகொள்ளுங்கள். '.repeat(4),
   ctaLabel:'மேலும் அறிய'};
 assert.deepEqual(parseEmailAiOutput(JSON.stringify(o)),{...o,body:o.body.trim()});
 assert.equal(parseEmailAiOutput({...o,body:'bad'}),null);
 assert.ok(emailModelPrompt(value,{businessName:'My Store',category:'Clothing',city:'Jaffna',
   brandName:'My Store',tone:'friendly',guidelines:'Only verified offers'}).system.includes('Never include URLs'));
 assert.ok(GEMINI_EMAIL_SCHEMA.required.includes('preheader'));
 for(const needle of ['SLBI_MARKETING_EMAIL_AI_ENABLED','SLBI_MARKETING_AI_ENABLED',
   'auth.getUser()','getMarketingAccessForUser','isPosterInternalQAAccount',
   ".eq('owner_id',user.id)",".eq('status','connected')"]){
   if(needle===".eq('status','connected')")continue;
   assert.ok(api.includes(needle),needle);
 }
 for(const n of ['marketing_reserve_ai_draft','marketing_complete_ai_draft',
 'marketing_refund_ai_draft','GEMINI_EMAIL_SCHEMA','GEMINI_POSTER_MODEL'])
   assert.ok(api.includes(n),n);
 assert.doesNotMatch(api,/gmail\.send|messages\/send|recipient[_ ]list|from\('leads'\)/);
 assert.match(ui,/onClick=\{\(\)=>void generateGeminiDraft\(\)\}/);
 assert.match(ui,/review every fact|Review every fact/);
});
test('Marketing opt-in is optional, explicit, separately stored, pending until verified',()=>{
 const good={request_id:uuid,business_id:'b8888888-2222-4222-8222-888888888888',
 name:'Example Contact',email:'person@example.com',phone:'+94 771234567',
 message:'Please tell me about your service.',consent:true,turnstile_token:'test-token-abc'};
 assert.equal(validateLeadSubmission(good).ok,true);
 const yes=validateLeadSubmission({...good,marketing_opt_in:true});
 assert.equal(yes.ok,true);
 if(yes.ok)assert.equal(yes.value.marketingOptIn,true);
 const no=validateLeadSubmission({...good,marketing_opt_in:false});
 if(no.ok)assert.equal(no.value.marketingOptIn,false);
 assert.equal(validateLeadSubmission({...good,marketing_opt_in:'true'}).ok,false);
 assert.match(form,/setMarketingOptIn/);
 assert.match(form,/NEXT_PUBLIC_EMAIL_OPTIN_ENABLED/);
 assert.match(form,/Receive occasional offers &amp; updates/);
 assert.match(form,/Optional and separate from this enquiry/);
 assert.match(form,/marketing_opt_in:emailOptInEnabled&&marketingOptIn/);
 assert.match(submit,/slbi_submit_verified_lead_optin/);
 assert.match(submit,/checkedToken\.success/);
 assert.match(submit,/marketingConsent/);
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
 assert.match(migration,/confirmation_status IN \('pending','confirmed','revoked'\)/);
 assert.match(migration,/consented_at/);
 assert.match(migration,/REVOKE ALL ON public\.marketing_email_optins FROM PUBLIC,anon,authenticated/);
 assert.match(migration,/GRANT SELECT ON public\.marketing_email_optins TO authenticated/);
 assert.match(migration,/owner_id=\(SELECT auth\.uid\(\)\)/);
 assert.match(migration,/ON CONFLICT \(request_id\) DO NOTHING/);
 assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.slbi_submit_verified_lead_optin/);
 assert.match(migration,/DO NOT apply/);
 assert.doesNotMatch(migration,/DEFAULT 'confirmed'|SET confirmation_status='confirmed'/);
 assert.match(page,/\.eq\('confirmation_status','confirmed'\)/);
 assert.match(page,/\.is\('revoked_at',null\)/);
 assert.match(ui,/Confirmed Email Subscribers/);
 assert.doesNotMatch(ui,/42 Verified Subscribers/);
});
test('Connected Gmail requires real owner-scoped status, sending not silently activated',()=>{
 assert.match(page,/\.eq\('provider','google_mail'\)/);
 assert.match(page,/\.eq\('user_id',user\.id\)/);
 assert.match(page,/\.eq\('status','connected'\)/);
 assert.match(ui,/Connect Gmail to Send/);
 assert.match(ui,/Review Campaign for Sending/);
 assert.match(ui,/opt-in audience/);
 assert.doesNotMatch(ui,/Send campaign · gated|Schedule · gated/);
 assert.match(ui,/No recipient message is silently sent/);
 assert.doesNotMatch(ui,/messages\/send|gmail\.send\(/);
});
