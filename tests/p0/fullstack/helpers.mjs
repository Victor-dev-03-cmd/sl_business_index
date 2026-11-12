import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const status = JSON.parse(execFileSync("supabase",["status","-o","json"],{
 cwd:".p0-cloud",encoding:"utf8",stdio:["ignore","pipe","pipe"]
}));
export const BASE=(status.API_URL || "http://127.0.0.1:54321").replace(/\/$/,"");
export const ANON=status.ANON_KEY;
export const SERVICE=status.SERVICE_ROLE_KEY;
assert.ok(ANON&&SERVICE&&BASE,"Local Supabase status must expose ephemeral API keys");
export function log(value){process.stdout.write(value+"\n");}
export async function http(path,{method="GET",role="anon",jwt=null,body=null,contentType="application/json",raw=false,headers={}}={}){
 const token=jwt|| (role==="service"?SERVICE:ANON);
 const hdr={apikey:role==="service"?SERVICE:ANON,Authorization:"Bearer "+token,...headers};
 if(body!==null){hdr["Content-Type"]=contentType;}
 const res=await fetch(BASE+path,{
  method,headers:hdr,
  body:body===null?undefined:(raw?body:JSON.stringify(body)),
  signal:AbortSignal.timeout(12000)
 });
 const t=await res.text();let obj;try{obj=JSON.parse(t)}catch{obj=t}
 return {status:res.status,data:obj,headers:res.headers};
}
export function ok(r,context,statuses=[200,201,204]) {
 assert.ok(statuses.includes(r.status),context+": HTTP "+r.status+": "+JSON.stringify(r.data).slice(0,260));
 return r.data;
}
export async function createUser(email){
 const password="TemporaryP0_Cloud_Test_2026!!";
 const r=await http("/auth/v1/admin/users",{role:"service",method:"POST",body:{email,password,email_confirm:true}});
 const d=ok(r,"create test auth user",[200,201]);assert.ok(d.id,"new auth user id");
 return {id:d.id,email,password};
}
export async function login(user){
 const r=await http("/auth/v1/token?grant_type=password",{method:"POST",body:{email:user.email,password:user.password}});
 const d=ok(r,"auth sign-in",[200]);assert.ok(d.access_token,"real JWT expected");
 return d.access_token;
}
export function saveFixture(x){writeFileSync(".p0-cloud/p0-fixtures.json",JSON.stringify(x),{mode:0o600});}
export function readFixture(){return JSON.parse(readFileSync(".p0-cloud/p0-fixtures.json","utf8"));}
