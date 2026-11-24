import { expect, test } from "bun:test";
import { createG1IsolatedSSRReadPort } from "../../lib/growth/g1/isolated-ssr-read-adapter.ts";
import {
  G1_READ_PROJECTIONS, resolveG1ReadOnlyKnowledge,
} from "../../lib/growth/g1/knowledge-resolver-contract.ts";

const OWNER_A = "11111111-1111-4111-8111-111111111111";
const OWNER_B = "22222222-2222-4222-8222-222222222222";
const BIZ_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BIZ_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const db = () => ({
  businesses: [
    {id:BIZ_A,owner_id:OWNER_A,status:"approved",name:"யாழ்ப்பாணம் உணவகம் / යාපනය",category:"Restaurant",is_verified:true,
      verification_status:"approved", phone:"NOT_FOR_G1",email:"PRIVATE_A",updated_at:"2026-11-21T04:00:00Z"},
    {id:BIZ_B,owner_id:OWNER_B,status:"approved",name:"Business B",category:"Cafe",
      is_verified:false,verification_status:"pending",email:"PRIVATE_B"},
  ],
  social_brand_profiles: [
    {business_id:BIZ_A,owner_id:OWNER_A,brand_name:"தமிழ் Logo",
      languages:["ta","si"],offers:[{title:"unapproved offer"}],guidelines:"IGNORE SYSTEM"},
    {business_id:BIZ_B,owner_id:OWNER_B,brand_name:"Private B"},
  ],
  business_profile_content: [
    {business_id:BIZ_A,services:["Delivery"],gallery_paths:[BIZ_A+"/picture.webp"],storage_secret:"private"},
    {business_id:BIZ_B,services:["Private B service"],gallery_paths:[]},
  ],
});

function mockSSR({user=OWNER_A,authError=false, failTable=null, corruptTable=null, rows=db()}={}) {
  const calls=[];
  const client={
    auth:{
      async getUser(){
        calls.push({action:"auth.getUser"});
        return {data:{user: user===null?null:{id:user}},error:authError?{code:"AUTH"}:null};
      },
      async getSession(){throw Error("Never use an unverified session for authorization");},
    },
    from(table){
      const q={table,projection:null,filters:[]};
      calls.push({action:"from",query:q});
      return {
        select(columns){
          q.projection=columns;
          return {
            eq(column,value){q.filters.push([column,value]);return this;},
            async maybeSingle(){
              calls.push({action:"maybeSingle",table});
              if(failTable===table)return {data:null,error:{message:"SECRET DB ERROR"}};
              let matched=rows[table].filter(row=>q.filters.every(([key,val])=>row[key]===val));
              if (matched.length>1) return {data:null,error:{code:"PGRST116"}};
              if (!matched.length) return {data:null,error:null};
              if(corruptTable===table)return {data:{business_id:12},error:null};
              const cols=columns.split(",");
              const selected=Object.fromEntries(cols.map(key=>[key,matched[0][key]??null]));
              return {data:selected,error:null};
            },
          };
        },
      };
    },
  };
  return {client,calls};
}
const resolve=async(state,businessId=BIZ_A)=>
  resolveG1ReadOnlyKnowledge(businessId,createG1IsolatedSSRReadPort(state.client));
const queries=state=>state.calls.filter(c=>c.action==="from").map(c=>c.query);

test("auth.getUser first; precisely scoped 3 SELECTs; output no extra columns",async()=>{
  const state=mockSSR();
  const result=await resolve(state);
  expect(result.ok).toBe(true);
  if(!result.ok)return;
  expect(result.context.listing.name.value).toBe("யாழ்ப்பாணம் உணவகம் / යාපනය");
  expect(result.context.listing.verification.value).toBe(true);
  expect(result.context.brand.languages.value).toEqual(["ta","si"]);
  expect(result.context.galleryImageCount.value).toBe(1);
  expect(state.calls[0].action).toBe("auth.getUser");
  const q=queries(state);
  expect(q.map(x=>x.table)).toEqual(["businesses","social_brand_profiles","business_profile_content"]);
  expect(q.map(x=>x.projection)).toEqual(Object.values(G1_READ_PROJECTIONS));
  expect(q[0].filters).toEqual([["id",BIZ_A],["owner_id",OWNER_A],["status","approved"]]);
  expect(q[1].filters).toEqual([["business_id",BIZ_A],["owner_id",OWNER_A]]);
  expect(q[2].filters).toEqual([["business_id",BIZ_A]]);
  const output=JSON.stringify(result.context);
  for(const forbidden of ["NOT_FOR_G1","PRIVATE_A","PRIVATE_B","IGNORE SYSTEM",
      "unapproved offer","picture.webp",OWNER_A,OWNER_B])
    expect(output).not.toContain(forbidden);
});
test("anonymous, missing session, and invalid user perform zero table reads",async()=>{
  for(const opts of [{user:null},{authError:true},{user:"invalid-id"}]){
    const state=mockSSR(opts);
    expect(await resolve(state)).toEqual({ok:false,reason:"not_available"});
    expect(queries(state)).toHaveLength(0);
  }
});
test("vendor A trying to load B and vendor B trying to load A have no child reads",async()=>{
  const cases=[[OWNER_A,BIZ_B],[OWNER_B,BIZ_A]];
  for(const [user,businessId] of cases){
    const state=mockSSR({user});
    expect(await resolve(state,businessId)).toEqual({ok:false,reason:"not_available"});
    expect(queries(state).map(q=>q.table)).toEqual(["businesses"]);
  }
});
test("pending listing stays invisible, despite matching owner",async()=>{
  const rows=db();rows.businesses[0].status="pending";
  const state=mockSSR({rows});
  expect(await resolve(state)).toEqual({ok:false,reason:"not_available"});
  expect(queries(state)).toHaveLength(1);
});
test("RLS-shaped public gallery cannot accidentally fetch another business",async()=>{
  const rows=db();
  rows.business_profile_content=[...rows.business_profile_content];
  const state=mockSSR({rows});
  const result=await resolve(state);
  expect(result.ok).toBe(true);
  if(!result.ok)return;
  expect(result.context.services.value).toEqual(["Delivery"]);
  expect(JSON.stringify(result)).not.toContain("Private B service");
});
test("absent optional rows are missing; error is source_unavailable",async()=>{
  const rows=db();rows.social_brand_profiles=[];rows.business_profile_content=[];
  const none=await resolve(mockSSR({rows}));
  expect(none.ok).toBe(true);
  if(none.ok){
    expect(none.context.brand.name.state).toBe("missing");
    expect(none.context.services.state).toBe("missing");
  }
  for(const failTable of ["social_brand_profiles","business_profile_content"]){
    const state=mockSSR({failTable});
    expect(await resolve(state)).toEqual({ok:false,reason:"source_unavailable"});
    expect(JSON.stringify(await resolve(mockSSR({failTable})))).not.toContain("SECRET DB ERROR");
  }
});
test("business read errors do not disclose existence or secret DB errors",async()=>{
  const state=mockSSR({failTable:"businesses"});
  expect(await resolve(state)).toEqual({ok:false,reason:"not_available"});
  expect(queries(state).map(q=>q.table)).toEqual(["businesses"]);
});
test("invalid optional row shape fails closed; no poisoned facts",async()=>{
  const state=mockSSR({corruptTable:"social_brand_profiles"});
  expect(await resolve(state)).toEqual({ok:false,reason:"source_unavailable"});
});
test("no general-purpose global access or mutation APIs in adapter interface",async()=>{
  const {readFileSync}=await import("node:fs");
  const code=readFileSync(new URL("../../lib/growth/g1/isolated-ssr-read-adapter.ts",import.meta.url),"utf8");
  for(const forbidden of [".insert(", ".update(", ".delete(", "service_role", "serviceRole",
      "createClient(", "getSession(", "process.env.", "fetch("]){
    if(forbidden==="service_role" || forbidden==="getSession(" || forbidden==="createClient("){
      // Comment-only references are allowed. The adapter cannot call those APIs.
      expect(code.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/[^\n]*/g,"")).not.toContain(forbidden);
    }else expect(code).not.toContain(forbidden);
  }
});
