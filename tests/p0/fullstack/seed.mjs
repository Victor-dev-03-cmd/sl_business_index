import {http,ok,createUser,saveFixture,log} from "./helpers.mjs";
const users={};
for(const [key,email] of Object.entries({
 admin:"slbi-p0-admin@example.test",
 vendorA:"slbi-p0-a@example.test",
 vendorB:"slbi-p0-b@example.test",
 customer:"slbi-p0-customer@example.test"
})){users[key]=await createUser(email);}
for(const [name,user] of Object.entries(users)){
 const role=name==="admin"?"admin":name==="customer"?"customer":"vendor";
 ok(await http("/rest/v1/profiles",{
  role:"service",method:"POST",body:{id:user.id,email:user.email,phone:"0700000000",push_token:"secret-test-token",role},
  headers:{Prefer:"return=representation"}
 }),"create "+role+" profile",[200,201,204]);
}
const businesses={};
for(const [key,owner,status] of [
 ["approvedA",users.vendorA.id,"approved"],
 ["pendingA",users.vendorA.id,"pending"],
 ["pendingB",users.vendorB.id,"pending"],
 ["rejectedB",users.vendorB.id,"rejected"]
]){
 const r=await http("/rest/v1/businesses",{role:"service",method:"POST",
  body:{owner_id:owner,name:key,status,description:"Synthetic "+key},
  headers:{Prefer:"return=representation"}});
 const d=ok(r,"create "+key+" business",[200,201]);
 businesses[key]=d[0]?.id;
 if(!businesses[key])throw Error("Missing "+key+" business id");
}
saveFixture({users,businesses});
log("PASS: real Supabase Auth users and synthetic business fixtures seeded");
