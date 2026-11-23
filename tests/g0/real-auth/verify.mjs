// Disposable real Supabase Auth JWT + PostgREST G0 candidate checks; Bun runtime.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {http,ok,login,readFixture,log} from '../../p0/fullstack/helpers.mjs';
const {users,businesses}=readFixture();
const [vendorA,vendorB,admin,customer]=await Promise.all([
  login(users.vendorA),login(users.vendorB),login(users.admin),login(users.customer)
]);
const rpc='/rest/v1/rpc/slbi_submit_verified_lead';
const body={
  p_request_id:randomUUID(),p_business_id:businesses.approvedA,
  p_name:'G0 Synthetic Customer',p_email:'g0@testing.invalid',
  p_phone:'0755555555',p_message:'Synthetic test message',
  p_rate_bucket:randomBytes(32).toString('hex'),
  p_business_bucket:randomBytes(32).toString('hex')
};
const call=(payload,opts={})=>http(rpc,{method:'POST',body:payload,...opts});
const denied=(response,label)=>assert.ok(response.status>=400,
  label+': expected 4xx, received '+response.status);
denied(await call(body),'Anonymous RPC');
denied(await call(body,{jwt:vendorA}),'Vendor RPC');
denied(await call(body,{jwt:admin}),'Admin RPC');
denied(await http('/rest/v1/slbi_lead_request_receipts?select=request_id'),'Anonymous receipts');
denied(await http('/rest/v1/slbi_lead_rate_limits?select=bucket',{jwt:vendorB}),'Vendor private rate table');
log('PASS real JWT: anon/auth/admin cannot access service RPC or private tables');

let id=ok(await call(body,{role:'service'}),'service lead request');
assert.match(id,/^[a-f0-9-]{36}$/);
assert.equal(ok(await call({...body,p_name:' G0 Synthetic Customer '},{role:'service'}),'same request'),id);
let resp=await call({...body,p_message:'Altered synthetic message'},{role:'service'});
denied(resp,'changed request'); assert.equal(resp.data?.code,'22023');
resp=await call({...body,p_business_id:businesses.approvedB},{role:'service'});
denied(resp,'cross-business reuse'); assert.equal(resp.data?.code,'22023');
assert.equal(ok(await call({...body,p_request_id:randomUUID(),p_business_id:businesses.pendingA},{role:'service'}),'unapproved listing'),null);
const own=ok(await http('/rest/v1/leads?select=id',{jwt:vendorA}),'owner A leads');
const cross=ok(await http('/rest/v1/leads?select=id',{jwt:vendorB}),'owner B leads');
assert.ok(own.some(x=>x.id===id));
assert.ok(!cross.some(x=>x.id===id));
log('PASS real HTTP: service-only normalized replay, conflict and owner A/B isolation');

ok(await http('/rest/v1/leads',{method:'POST',
  body:{business_id:businesses.approvedA,name:'G0 Legacy Test Visitor',
    phone:'0771234567',message:'Legacy anonymous submission',status:'new'}}),
  'legacy anonymous enquiry',[201,204]);
log('PASS real HTTP: anonymous legacy mobile lead compatibility');

const url='/rest/v1/businesses?id=eq.'+businesses.approvedB+'&select=rating,reviews_count';
let score=ok(await http(url),'before score');
assert.equal(Number(score[0].rating),4);
assert.equal(score[0].reviews_count,1);
ok(await http('/rest/v1/businesses?id=eq.'+businesses.approvedB,{
  method:'PATCH',jwt:vendorB,body:{rating:1,reviews_count:999},
  headers:{Prefer:'return=representation'}}),'owner attempted spoof',[200,204]);
score=ok(await http(url),'canonical score after spoof');
assert.equal(Number(score[0].rating),4);
assert.equal(score[0].reviews_count,1);
log('PASS real JWT: owner rating/review-count spoof rejected by trigger');

let pending=ok(await http('/rest/v1/reviews',{method:'POST',jwt:customer,
  body:{business_id:businesses.approvedB,user_id:users.customer.id,
    user_name:'G0 Synthetic Reviewer',rating:5,
    comment:'Pending G0 review',is_approved:false,moderation_status:'pending'},
  headers:{Prefer:'return=representation'}}),'customer pending review',[200,201]);
assert.equal(pending.length,1);
score=ok(await http(url),'pending score');
assert.equal(score[0].reviews_count,1);
resp=await http('/rest/v1/reviews?id=eq.'+pending[0].id,{method:'PATCH',jwt:vendorB,
  body:{is_approved:true,moderation_status:'approved'},
  headers:{Prefer:'return=representation'}});
assert.ok(resp.status>=400||(Array.isArray(resp.data)&&resp.data.length===0),
  'Vendor cannot moderate review');
const approved=ok(await http('/rest/v1/reviews?id=eq.'+pending[0].id,{
  method:'PATCH',jwt:admin,body:{is_approved:true,moderation_status:'approved'},
  headers:{Prefer:'return=representation'}}),'real admin moderation');
assert.equal(approved.length,1);
score=ok(await http(url),'approved score');
assert.equal(score[0].reviews_count,2);
assert.equal(Number(score[0].rating),4.5);
log('PASS real JWT: admin moderation updates canonical cache, vendor moderation denied');
log('ALL G0 REAL AUTH TESTS PASSED (synthetic, no production access)');
