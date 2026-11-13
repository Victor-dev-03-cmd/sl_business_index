import assert from 'node:assert/strict';
import { http, ok, login, readFixture, log } from '../p0/fullstack/helpers.mjs';

const {users,businesses}=readFixture();
const [vendorA,vendorB,admin,customer,customer2]=await Promise.all([
  login(users.vendorA),login(users.vendorB),login(users.admin),
  login(users.customer),login(users.customer2)
]);
const reviewUrl='/rest/v1/reviews';
const leadUrl='/rest/v1/leads';

// Existing public reviews remain visible, no implicit data loss.
let r=await http(reviewUrl+'?select=id,comment,is_approved');
assert.equal(ok(r,'public legacy reviews').length,2);
log('PASS real PostgREST: two legacy reviews remain published');

const body={
  business_id:businesses.approvedA,user_id:users.customer2.id,
  user_name:'P1 Review Customer',rating:5,
  comment:'A genuine test review awaiting moderation',
  is_approved:false,moderation_status:'pending'
};
r=await http(reviewUrl,{jwt:customer2,method:'POST',
  body:{...body,is_approved:true,moderation_status:'approved'},
  headers:{Prefer:'return=representation'}});
assert.ok(r.status>=400,'Direct approved review INSERT must be rejected');

r=await http(reviewUrl,{jwt:customer2,method:'POST',
  body:{...body,user_id:users.customer.id},
  headers:{Prefer:'return=representation'}});
assert.ok(r.status>=400,'Forged review author must be rejected');

r=await http(reviewUrl,{jwt:customer2,method:'POST',
  body:{...body,sentiment:'positive'},
  headers:{Prefer:'return=representation'}});
assert.ok(r.status>=400,'Authenticated reviewer cannot forge sentiment');

r=await http(reviewUrl,{jwt:customer2,method:'POST',
  body,headers:{Prefer:'return=representation'}});
const created=ok(r,'legitimate customer pending review',[201,200]);
const pendingId=created[0]?.id;
assert.ok(pendingId && created[0]?.moderation_status==='pending');
assert.equal(created[0].is_approved,false);

r=await http(reviewUrl+'?select=id,is_approved,moderation_status', {jwt:customer2});
assert.equal(ok(r,'pending author sees own review').length,3);
r=await http(reviewUrl+'?select=id,is_approved,moderation_status', {jwt:customer});
assert.equal(ok(r,'unrelated customer reviews').length,2);
r=await http(reviewUrl+'?select=id,is_approved,moderation_status');
assert.equal(ok(r,'anonymous public review list').length,2);
log('PASS real PostgREST: approved-insert bypass denied, pending visible to author only');

r=await http(reviewUrl,{jwt:customer2,method:'POST',
  body:{...body,comment:'Duplicate pending review'},
  headers:{Prefer:'return=representation'}});
assert.ok(r.status>=400,'Duplicate review must be blocked by UNIQUE constraint');

r=await http(reviewUrl,{jwt:vendorA,method:'POST',
  body:{...body,user_id:users.vendorA.id},
  headers:{Prefer:'return=representation'}});
assert.ok(r.status>=400,'Business owner cannot review own listing');

r=await http(reviewUrl+'?id=eq.'+pendingId,{
  jwt:vendorB,method:'PATCH',
  body:{moderation_status:'approved',is_approved:true},
  headers:{Prefer:'return=representation'}
});
assert.ok(r.status>=400||(Array.isArray(r.data)&&r.data.length===0),
  'Vendor B cannot approve a customer review');

r=await http(reviewUrl+'?id=eq.'+pendingId,{
  jwt:customer2,method:'PATCH',
  body:{moderation_status:'approved',is_approved:true},
  headers:{Prefer:'return=representation'}
});
assert.ok(r.status>=400||(Array.isArray(r.data)&&r.data.length===0),
  'Review author cannot approve their own review');

r=await http(reviewUrl+'?moderation_status=eq.pending&select=id,comment,created_at',
  {jwt:admin});
assert.equal(ok(r,'admin pending queue').length,1);
r=await http(reviewUrl+'?id=eq.'+pendingId,{
  jwt:admin,method:'PATCH',
  body:{moderation_status:'approved',is_approved:true,
    moderated_at:'2001-01-01T00:00:00Z',moderated_by:users.vendorB.id},
  headers:{Prefer:'return=representation'}
});
const changed=ok(r,'staff approve pending review');
assert.equal(changed.length,1);
assert.equal(changed[0].moderated_by,users.admin.id,
  'Database trigger must override spoofed moderator');
assert.ok(Date.parse(changed[0].moderated_at)>Date.parse('2026-01-01'),
  'Database must use server time for audit');
r=await http(reviewUrl+'?select=id,is_approved');
assert.equal(ok(r,'approved review is publicly visible').length,3);
log('PASS real PostgREST: signed-in admin approves, immutable audit actor/time, no impersonation');

// Reply ownership, uniqueness, and public approved-parent visibility.
const legacyReviews=await http(reviewUrl+'?select=id,business_id', {jwt:admin});
const approved=ok(legacyReviews,'review parent discovery');
const parentA=approved.find(item=>item.business_id===businesses.approvedA&&item.id!==pendingId);
assert.ok(parentA,'legacy approved review A exists');
const replyBody={review_id:parentA.id,vendor_id:users.vendorA.id,reply_text:'Thank you'};
r=await http('/rest/v1/review_replies',{jwt:vendorB,method:'POST',
  body:{...replyBody,vendor_id:users.vendorB.id}});
assert.ok(r.status>=400,'Vendor B cannot reply to A review');
r=await http('/rest/v1/review_replies',{jwt:vendorA,method:'POST',
  body:{...replyBody,vendor_id:users.vendorB.id}});
assert.ok(r.status>=400,'Vendor cannot forge different vendor_id');
r=await http('/rest/v1/review_replies',{jwt:vendorA,method:'POST',body:replyBody});
ok(r,'authorized vendor reply',[201,204]);
r=await http('/rest/v1/review_replies',{jwt:vendorA,method:'POST',body:replyBody});
assert.ok(r.status>=400,'Duplicate review reply must be rejected');
r=await http('/rest/v1/review_replies?select=review_id,reply_text');
assert.equal(ok(r,'public approved reply').length,1);
log('PASS real PostgREST: only listing owner replies, no duplicate replies');

// Anonymous legacy/mobile enquiry remains valid after privilege changes.
const leadBody={
  business_id:businesses.approvedA,name:'P1 Synthetic Visitor',
  phone:'0771234567',message:'Compatibility lead submission',status:'new'
};
r=await http(leadUrl,{method:'POST',body:leadBody,
  headers:{Prefer:'return=representation'}});
const newLead=ok(r,'legacy anonymous mobile enquiry',[201,200]);
const leadId=newLead[0]?.id;
assert.ok(leadId);
r=await http(leadUrl+'?select=id,business_id',{jwt:vendorB});
assert.equal(ok(r,'cross-vendor lead read').length,0);
r=await http(leadUrl+'?select=id,business_id',{jwt:vendorA});
assert.equal(ok(r,'owner lead read').length,1);
log('PASS real PostgREST: legacy anonymous enquiry and owner-only lead read');

// Follow-up rows are created and mutated only by owner, never public or B.
const due=new Date(Date.now()+2*86400000).toISOString();
r=await http('/rest/v1/lead_followups',{jwt:vendorA,method:'POST',
  body:{lead_id:leadId,due_at:due},headers:{Prefer:'return=representation'}});
const followup=ok(r,'authorized owner follow-up creation',[201,200]);
assert.equal(followup.length,1);
r=await http('/rest/v1/lead_followups?select=lead_id,due_at',{jwt:vendorB});
assert.equal(ok(r,'vendor B followup list').length,0);
r=await http('/rest/v1/lead_followups?select=lead_id,due_at');
assert.ok(r.status>=400,'Anonymous cannot access private followups');
r=await http('/rest/v1/lead_followups',{jwt:vendorB,method:'POST',
  body:{lead_id:leadId,due_at:due}});
assert.ok(r.status>=400,'Vendor B cannot create follow-up for A lead');
r=await http('/rest/v1/lead_followups?lead_id=eq.'+leadId,{
  jwt:vendorB,method:'PATCH',body:{done_at:new Date().toISOString()},
  headers:{Prefer:'return=representation'}});
assert.ok(r.status>=400||(Array.isArray(r.data)&&r.data.length===0),
  'Vendor B cannot complete A follow-up');
r=await http('/rest/v1/lead_followups?lead_id=eq.'+leadId,{
  jwt:vendorA,method:'PATCH',body:{done_at:new Date().toISOString()},
  headers:{Prefer:'return=representation'}});
assert.equal(ok(r,'vendor A completes reminder').length,1);
log('PASS real PostgREST: CRM follow-up create/read/update is tenant-private');

// Location guard blocks malformed new rows while leaving legacy status edits.
const loc={
  owner_id:users.vendorA.id,name:'P1 Valid Jaffna Place',
  status:'pending',address:'Jaffna, Northern Province, Sri Lanka',
  detailed_address:'No 45, Main Street, Jaffna, Sri Lanka',
  latitude:9.6615,longitude:80.0255,location:'SRID=4326;POINT(80.0255 9.6615)'
};
r=await http('/rest/v1/businesses',{jwt:vendorA,method:'POST',body:loc});
ok(r,'valid shop address with Sri Lanka point',[201,204]);
r=await http('/rest/v1/businesses',{jwt:vendorA,method:'POST',
  body:{...loc,name:'Invalid missing street',detailed_address:''}});
assert.ok(r.status>=400,'Missing physical address rejected');
r=await http('/rest/v1/businesses',{jwt:vendorA,method:'POST',
  body:{...loc,name:'Invalid point mismatch',longitude:79.4}});
assert.ok(r.status>=400,'Geography vs coordinate mismatch rejected');
r=await http('/rest/v1/businesses?id=eq.'+businesses.pendingA,{
  jwt:admin,method:'PATCH',body:{status:'rejected'},
  headers:{Prefer:'return=representation'}
});
assert.equal(ok(r,'legacy listing unrelated status change').length,1);
log('PASS real PostgREST: PostGIS location validation and legacy listing updates');

log('ALL P1 Docker Supabase Auth + PostgREST integration tests PASSED');
