import test from "node:test";
import assert from "node:assert/strict";
import {
  fuseSemanticV3, SEMANTIC_SEARCH_V3_VERSION, SEMANTIC_V3_ENABLED_BY_DEFAULT
} from "../lib/discovery/semanticFusionV3.ts";
import {rankHybridSearch} from "../lib/discovery/hybridSearch.ts";

const items=[
 {id:"a",name:"Jaffna Mechanics",category:"Repairing & Services",description:"car repair and engines",match_type:"exact_service",distance_meters:1600},
 {id:"b",name:"Raks Car Wash",category:"Repairing & Services",description:"car wash and detailing",match_type:"category_related",distance_meters:100},
 {id:"c",name:"Auto Garage",category:"Repairing & Services",description:"automotive vehicles",match_type:"category_related",distance_meters:800},
];
test("Research version and production-off default",()=>{
 assert.equal(SEMANTIC_SEARCH_V3_VERSION,"3.0.0-research");
 assert.equal(SEMANTIC_V3_ENABLED_BY_DEFAULT,false);
});
test("Disabled semantic search returns exact HybridSearch v2 baseline",()=>{
 const v2=rankHybridSearch(items,"car repair",3000,{specificService:true});
 const v3=fuseSemanticV3(items,"car repair",3000,[
  {businessId:"b",modelId:"intfloat/multilingual-e5-small",similarity:.99},
 ],{modelId:"intfloat/multilingual-e5-small",enabled:false,specificService:true});
 assert.deepEqual(v3.map(v=>v.id),v2.map(v=>v.id));
});
test("Semantic ranking cannot override confirmed exact service with car wash",()=>{
 const result=fuseSemanticV3(items,"car repair",3000,[
  {businessId:"b",modelId:"intfloat/multilingual-e5-small",similarity:.99},
  {businessId:"a",modelId:"intfloat/multilingual-e5-small",similarity:.4},
 ],{modelId:"intfloat/multilingual-e5-small",enabled:true,specificService:true});
 assert.equal(result[0].id,"a");
});
test("Wrong model IDs are ignored (vectors must be compatible)",()=>{
 const baseline=rankHybridSearch(items,"car repair",3000);
 const result=fuseSemanticV3(items,"car repair",3000,[
  {businessId:"b",modelId:"other-model",similarity:.98},
 ],{modelId:"intfloat/multilingual-e5-small",enabled:true});
 assert.deepEqual(result.map(x=>x.id),baseline.map(x=>x.id));
});
test("Off-radius or unapproved candidate cannot be injected",()=>{
 const result=fuseSemanticV3(items,"car repair",3000,[
  {businessId:"outside",modelId:"intfloat/multilingual-e5-small",similarity:.99},
  {businessId:"b",modelId:"intfloat/multilingual-e5-small",similarity:.92},
 ],{modelId:"intfloat/multilingual-e5-small",enabled:true});
 assert.equal(result.length,items.length);
 assert.ok(result.every(x=>x.id!=="outside"));
});
test("Invalid NaN/Infinity scores and empty text keep fallback",()=>{
 const baseline=rankHybridSearch(items,"",3000);
 const result=fuseSemanticV3(items,"",3000,[{
  businessId:"a",modelId:"intfloat/multilingual-e5-small",similarity:Infinity
 }],{modelId:"intfloat/multilingual-e5-small",enabled:true});
 assert.deepEqual(result.map(x=>x.id),baseline.map(x=>x.id));
});
test("Stable deterministic ordering and no candidate mutations",()=>{
 const before=JSON.stringify(items);
 const hits=[
  {businessId:"b",modelId:"intfloat/multilingual-e5-small",similarity:.99},
  {businessId:"a",modelId:"intfloat/multilingual-e5-small",similarity:.55},
 ];
 const args={modelId:"intfloat/multilingual-e5-small",enabled:true};
 const x=fuseSemanticV3(items,"car",3000,hits,args);
 const y=fuseSemanticV3(items,"car",3000,hits,args);
 assert.deepEqual(x.map(z=>z.id),y.map(z=>z.id));
 assert.equal(JSON.stringify(items),before);
});
