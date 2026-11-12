import assert from "node:assert/strict";
import {http,ok,login,readFixture,log} from "./helpers.mjs";
const {users,businesses}=readFixture();
const [a,b,admin,customer]=await Promise.all([
 login(users.vendorA),login(users.vendorB),login(users.admin),login(users.customer)
]);
const select="id,email,phone,push_token,role";
let r=await http("/rest/v1/profiles?select="+select);
ok(r,"anonymous profiles query");
assert.deepEqual(r.data,[],"Anonymous user cannot read any profiles or private fields");
log("PASS: anonymous profile PII not exposed over real PostgREST");
r=await http("/rest/v1/profiles?select="+select,{jwt:a});
ok(r,"owner profile GET");assert.equal(r.data.length,1);assert.equal(r.data[0].id,users.vendorA.id);
r=await http("/rest/v1/profiles?select="+select,{jwt:b});
ok(r,"vendor B profile GET");assert.equal(r.data.length,1);assert.equal(r.data[0].id,users.vendorB.id);
r=await http("/rest/v1/profiles?select=id,role",{jwt:admin});
ok(r,"admin profiles query");assert.equal(r.data.length,4,"staff can manage accounts");
log("PASS: vendor cross-user profile isolation, real staff access");
r=await http("/rest/v1/profiles?id=eq."+users.vendorA.id,{
 jwt:a,method:"PATCH",body:{phone:"0701234567"},headers:{Prefer:"return=representation"}});
ok(r,"own profile edit");
assert.equal(r.data[0]?.phone,"0701234567");
r=await http("/rest/v1/profiles?id=eq."+users.vendorA.id,{
 jwt:a,method:"PATCH",body:{role:"admin"},headers:{Prefer:"return=representation"}});
assert.ok(r.status>=400,"Vendor cannot assign self admin role");
r=await http("/rest/v1/profiles?id=eq."+users.vendorA.id,{
 jwt:b,method:"PATCH",body:{phone:"0709999999"},headers:{Prefer:"return=representation"}});
assert.ok(r.status<300 && Array.isArray(r.data) && r.data.length===0,
 "Vendor B cannot update vendor A");
log("PASS: legitimate profile update, role escalation denied, cross-user update hidden");
r=await http("/rest/v1/businesses?select=id,status,owner_id");
ok(r,"anon businesses");assert.equal(r.data.length,1,"only approved listings public");
assert.equal(r.data[0].id,businesses.approvedA);
r=await http("/rest/v1/businesses?select=id,status,owner_id",{jwt:a});
ok(r,"vendor A businesses");assert.equal(r.data.length,2,"own pending plus approved business");
r=await http("/rest/v1/businesses?select=id,status,owner_id",{jwt:b});
ok(r,"vendor B businesses");assert.equal(r.data.length,3,"own pending/rejected plus approved");
r=await http("/rest/v1/businesses?id=eq."+businesses.pendingA,{
 jwt:a,method:"PATCH",body:{status:"approved"},headers:{Prefer:"return=representation"}});
assert.ok(r.status>=400,"Unprivileged vendor cannot approve own listing");
r=await http("/rest/v1/businesses?id=eq."+businesses.pendingA,{
 jwt:admin,method:"PATCH",body:{status:"approved"},headers:{Prefer:"return=representation"}});
ok(r,"admin approve business");
log("PASS: public approved-only listings, vendor ownership, admin approval");
// Exercise the real legacy/mobile HTTP path against its restricted RLS.
const legacy = {
 business_id:businesses.approvedA, name:"Mobile Test Customer",
 phone:"0771234567", message:"A real PostgREST mobile enquiry",
 source:"Mobile App - Business Details"
};
r=await http("/rest/v1/leads",{method:"POST",body:legacy});
ok(r,"legacy mobile approved enquiry",[201,204]);
r=await http("/rest/v1/leads",{method:"POST",body:{...legacy,business_id:businesses.pendingB}});
assert.ok(r.status>=400,"Unapproved business cannot receive legacy anonymous lead");
r=await http("/rest/v1/leads",{method:"POST",body:{...legacy,status:"converted"}});
assert.ok(r.status>=400,"Anonymous client cannot forge CRM conversion");
r=await http("/rest/v1/leads",{method:"POST",body:{...legacy,name:" "}});
assert.ok(r.status>=400,"Blank lead name must be rejected");
r=await http("/rest/v1/leads?select=id,business_id,name",{jwt:a});
ok(r,"vendor owner views own lead");assert.equal(r.data.length,1);
r=await http("/rest/v1/leads?select=id,business_id,name",{jwt:b});
ok(r,"other vendor cannot view lead");assert.equal(r.data.length,0);
log("PASS: real API legacy mobile enquiry compatibility, validation and owner isolation");

r=await http("/rest/v1/verifications",{jwt:a,method:"POST",
 body:{business_id:businesses.approvedA,status:"pending"},headers:{Prefer:"return=representation"}});
ok(r,"vendor submit pending verification");
const vId=r.data[0].id;
r=await http("/rest/v1/verifications",{jwt:a,method:"POST",
 body:{business_id:businesses.approvedA,status:"approved"},headers:{Prefer:"return=representation"}});
assert.ok(r.status>=400,"Vendor preapproving own verification must fail");
r=await http("/rest/v1/verifications?id=eq."+vId,{
 jwt:a,method:"PATCH",body:{status:"approved"},headers:{Prefer:"return=representation"}});
assert.ok(r.status<300 && r.data.length===0,"Vendor cannot update submitted verification");
r=await http("/rest/v1/verifications?select=id,business_id,status",{jwt:b});
ok(r,"vendor B verification query");assert.equal(r.data.length,0);
r=await http("/rest/v1/verifications?id=eq."+vId,{
 jwt:admin,method:"PATCH",body:{status:"approved"},headers:{Prefer:"return=representation"}});
ok(r,"admin verify business");
log("PASS: verification pending-only, cross-vendor confidentiality, staff approval");
const docPath=users.vendorA.id+"/"+businesses.approvedA+"/synthetic-proof.txt";
r=await http("/storage/v1/object/verification-docs/"+docPath,{
 jwt:a,method:"POST",body:"Synthetic P0 testing only",raw:true,contentType:"text/plain"});
ok(r,"vendor A private document upload");
r=await http("/storage/v1/object/list/verification-docs",{
 jwt:b,method:"POST",body:{prefix:"",limit:50}});
ok(r,"vendor B document listing");assert.equal(r.data.length,0,"No cross-vendor private documents");
r=await http("/storage/v1/object/list/verification-docs",{
 jwt:admin,method:"POST",body:{prefix:"",limit:50}});
ok(r,"admin document listing");assert.ok(r.data.length>=1,"Admin can see verification documents");
r=await http("/storage/v1/object/public/verification-docs/"+docPath);
assert.ok(r.status>=400,"Private verification bucket cannot serve public file URL");
r=await http("/storage/v1/object/sign/verification-docs/"+docPath,{
 jwt:a,method:"POST",body:{expiresIn:60}});
ok(r,"owner signed private document");
assert.ok(r.data.signedURL || r.data.signedUrl,"Authorized signed URL expected");
r=await http("/storage/v1/object/sign/verification-docs/"+docPath,{
 jwt:b,method:"POST",body:{expiresIn:60}});
assert.ok(r.status>=400,"Vendor B cannot sign Vendor A's private document");
r=await http("/storage/v1/object/verification-docs/"+users.vendorB.id+"/"+businesses.approvedA+"/forged.txt",{
 jwt:a,method:"POST",body:"Synthetic cross-owner attempt",raw:true,contentType:"text/plain"});
assert.ok(r.status>=400,"Vendor A cannot upload using Vendor B's private storage folder");
log("PASS: real Supabase Storage private bucket, owner upload, admin visibility, signed URL");
r=await http("/rest/v1/profiles?select=id,role",{jwt:customer});
ok(r,"regular customer profile");assert.equal(r.data.length,1);
const newEmail="slbi-p0-new-signup@example.test";
const newPassword="TemporaryP0_Signup_2026!!";
r=await http("/auth/v1/signup",{method:"POST",body:{email:newEmail,password:newPassword}});
const created=ok(r,"real Supabase sign-up",[200,201]);
assert.ok(created.user?.id,"Signup must create auth identity");
let newToken=created.access_token;
if(!newToken){
 const confirm=await http("/auth/v1/admin/users/"+created.user.id,{
  role:"service",method:"PUT",body:{email_confirm:true}});
 ok(confirm,"confirm synthetic signup account",[200]);
 const signed=await http("/auth/v1/token?grant_type=password",{
  method:"POST",body:{email:newEmail,password:newPassword}});
 newToken=ok(signed,"signup login").access_token;
}
assert.ok(newToken,"New user must authenticate");
r=await http("/rest/v1/profiles",{jwt:newToken,method:"POST",body:{
 id:created.user.id,email:newEmail
},headers:{Prefer:"return=representation"}});
ok(r,"signup owner default profile");
assert.equal(r.data[0]?.role,"customer","Untrusted signup cannot choose elevated account roles");
r=await http("/rest/v1/profiles",{jwt:newToken,method:"POST",body:{
 id:created.user.id,email:newEmail,role:"admin"
},headers:{Prefer:"return=representation"}});
assert.ok(r.status>=400,"Untrusted signup cannot create admin profile");
log("PASS: real Auth signup, owner profile creation and role escalation rejection");
log("PASS: 4 authenticated accounts and anonymous API access isolation");
