import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateLeadSubmission } from '../lib/growth/lead-contract.ts';

const good={
  request_id:'4a0c426a-25e8-42f8-94c3-0a844e97d002',
  business_id:'123e4567-e89b-42d3-a456-426614174000',
  name:'Customer Name',
  email:'customer@example.com',
  phone:'+94 77 123 4567',
  message:'Please contact me about your services.',
  consent:true,
  turnstile_token:'a-valid-looking-verification-token',
};
const form=readFileSync(new URL('../app/business/[slug]/BusinessDetailsClient.tsx',import.meta.url),'utf8');
const endpoint=readFileSync(new URL('../app/api/leads/submit/route.ts',import.meta.url),'utf8');
const sql=readFileSync(new URL('../docs/growth/SECURE_LEAD_SUBMISSION_REVIEW_ONLY.sql',import.meta.url),'utf8');

test('web lead validation requires consent, business UUID and bounded contact details',()=>{
  const v=validateLeadSubmission(good);
  assert.equal(v.ok,true);
  if(v.ok){assert.equal(v.value.email,'customer@example.com');assert.equal(v.value.consent,true);}
  assert.equal(validateLeadSubmission({...good,consent:false}).ok,false);
  assert.equal(validateLeadSubmission({...good,request_id:'bad'}).ok,false);
  assert.equal(validateLeadSubmission({...good,business_id:'deleted/listing'}).ok,false);
  assert.equal(validateLeadSubmission({...good,phone:'<script>alert(1)</script>'}).ok,false);
  assert.equal(validateLeadSubmission({...good,email:'not an email'}).ok,false);
  assert.equal(validateLeadSubmission({...good,name:'a'}).ok,false);
  assert.equal(validateLeadSubmission({...good,message:'x'.repeat(3001)}).ok,false);
  assert.equal(validateLeadSubmission({...good,turnstile_token:''}).ok,false);
});

test('customer enquiry UI preserves existing mobile-era fallback until migration',()=>{
  assert.match(form,/setLeadConsent/);
  assert.match(form,/<Turnstile/);
  assert.match(form,/NEXT_PUBLIC_SECURE_LEADS_ENABLED/);
  assert.match(form,/turnstile_token: turnstileToken/);
  assert.match(form,/supabase\.from\("leads"\)\.insert/);
});
test('secure lead endpoint fails closed and validates real Turnstile server-side',()=>{
  assert.match(endpoint,/SLBI_SECURE_LEADS_ENABLED!=='true'/);
  assert.match(endpoint,/CLOUDFLARE_TURNSTILE_SECRET_KEY/);
  assert.match(endpoint,/challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.match(endpoint,/checkedToken\.action!=='business_enquiry'/);
  assert.match(endpoint,/checkedToken\.hostname!==host/);
  assert.match(endpoint,/createHmac\('sha256'/);
  assert.match(endpoint,/supabase\.rpc\('slbi_submit_verified_lead'/);
  assert.match(endpoint,/SUPABASE_SECRET_KEY\|\|process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(endpoint,/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
});
test('staged SQL mandates atomic dedupe and restricted RPC grants',()=>{
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/slbi_lead_request_receipts/);
  assert.match(sql,/slbi_lead_rate_limits/);
  assert.match(sql,/security invoker/i);
  assert.match(sql,/revoke execute on function public\.slbi_submit_verified_lead/);
  assert.match(sql,/service_role/);
  assert.match(sql,/slbi_cleanup_growth_ephemeral/);
});
