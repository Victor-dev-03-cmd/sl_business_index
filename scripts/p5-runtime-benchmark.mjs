import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createCategoryApi} from '../lib/discovery/category-http.ts';
const snapshot={rows:Array.from({length:32},(_,i)=>({id:i,name:'Category '+i,icon:null,parent_id:null})),fetchedAt:0};
const load=async()=>snapshot;
const native=async()=>Response.json(await load(),{headers:{'Cache-Control':'no-store'}});
const app=createCategoryApi(load);
const hono=()=>app.fetch(new Request('http://localhost/api/public/categories'));
for(const handler of [native,hono]){
 const response=await handler();
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.deepEqual(await response.json(),snapshot);
}
const fail=createCategoryApi(async()=>{throw new Error('fixture failure')});
const response=await fail.request('/api/public/categories');
assert.equal(response.status,503);
assert.deepEqual(await response.json(),{error:'Categories unavailable'});
assert.equal((await app.request('/api/admin')).status,404);
async function measure(handler){
 for(let i=0;i<300;i++)await (await handler()).arrayBuffer();
 const samples=[];let errors=0;const start=performance.now();
 for(let i=0;i<2000;i++){
  const t=performance.now();
  const res=await handler();await res.arrayBuffer();
  if(res.status!==200)errors++;
  samples.push(performance.now()-t);
 }
 const elapsed=performance.now()-start;
 samples.sort((a,b)=>a-b);
 return {count:samples.length,p50Ms:samples[999],p95Ms:samples[1899],requestsPerSecond:2000/(elapsed/1000),errors};
}
console.log(JSON.stringify({runtime:process.versions.bun?'bun':'node',version:process.versions.bun||process.versions.node,scope:'synthetic in-process warm handler; not HTTP or production latency',native:await measure(native),hono:await measure(hono)},null,2));
