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
log("PASS: real Supabase Storage private bucket, owner upload, admin visibility, signed URL");
r=await http("/rest/v1/profiles?select=id,role",{jwt:customer});
ok(r,"regular customer profile");assert.equal(r.data.length,1);
log("PASS: 4 authenticated accounts and anonymous API access isolation");
