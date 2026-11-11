import test from "node:test";
import assert from "node:assert/strict";
import {
 SEMANTIC_SEARCH_VERSION, SEMANTIC_ROLLOUT,
 evaluateSemanticGate, fuseVerifiedSemantic
} from "../lib/discovery/semanticSearchV3.ts";

const readyState={
 indexedApproved:22,totalApproved:22,modelId:"model-reviewed@1",
 benchmarkNdcgV2:0.61,benchmarkNdcgV3:0.67,
 queryEmbeddingP95Ms:170,nativeLanguageJudgments:160,
 nativeLanguageQueryCount:120,reviewPassed:true
};
test("SemanticSearch v3 version and default disabled",()=>{
 assert.equal(SEMANTIC_SEARCH_VERSION,"3.0.0");
 assert.equal(SEMANTIC_ROLLOUT.enabled,false);
 assert.ok(evaluateSemanticGate(readyState).blockers.includes("feature flag disabled"));
});
test("gate blocks missing model, absent human judgments and latency",()=>{
 const config={enabled:true,modelId:"model-reviewed@1",minimumIndexedCoverage:.95,minimumNdcgImprovement:.02,maxEmbeddingLatencyMs:350};
 const gate=evaluateSemanticGate({...readyState,indexedApproved:11,modelId:"old",benchmarkNdcgV3:.62,queryEmbeddingP95Ms:900,reviewPassed:false,nativeLanguageJudgments:0},config);
 assert.equal(gate.ready,false);
 assert.ok(gate.blockers.length>=4);
});
test("gate only passes when all quality and coverage conditions pass",()=>{
 const config={enabled:true,modelId:"model-reviewed@1",minimumIndexedCoverage:.95,minimumNdcgImprovement:.02,maxEmbeddingLatencyMs:350};
 assert.equal(evaluateSemanticGate(readyState,config).ready,true);
});
test("fail-closed semantic fusion preserves baseline and original array",()=>{
 const baseline=[{id:"b"},{id:"a"},{id:"c"}];
 const snapshot=JSON.stringify(baseline);
 const output=fuseVerifiedSemantic(baseline,[{id:"c",similarity:.99,modelId:"bad"}],SEMANTIC_ROLLOUT,{ready:false,blockers:["disabled"],coverage:0});
 assert.deepEqual(output,baseline);
 assert.equal(JSON.stringify(baseline),snapshot);
});
test("semantic candidates must be real existing approved shortlist business IDs",()=>{
 const config={enabled:true,modelId:"model-reviewed@1",minimumIndexedCoverage:.95,minimumNdcgImprovement:.02,maxEmbeddingLatencyMs:350};
 const gate=evaluateSemanticGate(readyState,config);
 const baseline=[{id:"b"},{id:"a"},{id:"c"}];
 const out=fuseVerifiedSemantic(baseline,[
  {id:"unknown",similarity:1,modelId:"model-reviewed@1"},
  {id:"c",similarity:.95,modelId:"model-reviewed@1"},
  {id:"a",similarity:NaN,modelId:"model-reviewed@1"},
  {id:"b",similarity:.1,modelId:"wrong-model"}
 ],config,gate);
 assert.deepEqual(new Set(out.map(x=>x.id)),new Set(baseline.map(x=>x.id)));
 assert.equal(out.length,3);
});
test("missing vector input never silently invents a ranking",()=>{
 const config={enabled:true,modelId:"model-reviewed@1",minimumIndexedCoverage:.95,minimumNdcgImprovement:.02,maxEmbeddingLatencyMs:350};
 const gate=evaluateSemanticGate(readyState,config);
 const baseline=[{id:"a"},{id:"b"}];
 assert.deepEqual(fuseVerifiedSemantic(baseline,[],config,gate),baseline);
});
test("same model requirement avoids incompatible embedding spaces",()=>{
 const config={enabled:true,modelId:"model-reviewed@1",minimumIndexedCoverage:.95,minimumNdcgImprovement:.02,maxEmbeddingLatencyMs:350};
 const gate=evaluateSemanticGate(readyState,config);
 assert.deepEqual(fuseVerifiedSemantic([{id:"a"},{id:"b"}],[{id:"b",similarity:.9,modelId:"another-model"}],config,gate),[{id:"a"},{id:"b"}]);
});
test("nonfinite benchmark measurements are rejected",()=>{
 const config={enabled:true,modelId:"model-reviewed@1",minimumIndexedCoverage:.95,minimumNdcgImprovement:.02,maxEmbeddingLatencyMs:350};
 assert.equal(evaluateSemanticGate({...readyState,benchmarkNdcgV3:NaN},config).ready,false);
 assert.equal(evaluateSemanticGate({...readyState,queryEmbeddingP95Ms:Infinity},config).ready,false);
});

test("specific service evidence outranks stronger model similarity of an unverified shop",()=>{
 const cfg={enabled:true,modelId:"model-reviewed@1",minimumIndexedCoverage:.95,minimumNdcgImprovement:.02,maxEmbeddingLatencyMs:350};
 const gate=evaluateSemanticGate(readyState,cfg);
 const baseline=[
  {id:"exact",match_type:"exact_service"},
  {id:"related",match_type:"category_related"}
 ];
 const semantic=[
  {id:"related",similarity:.99,modelId:"model-reviewed@1"},
  {id:"exact",similarity:.12,modelId:"model-reviewed@1"}
 ];
 const result=fuseVerifiedSemantic(baseline,semantic,cfg,gate,{specificService:true});
 assert.equal(result[0].id,"exact");
});
