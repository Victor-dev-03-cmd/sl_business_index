import {readFileSync} from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {rankHybridSearch} from "../lib/discovery/hybridSearch.ts";
import {ndcgAtK,precisionAtK} from "../lib/discovery/searchEvaluation.ts";
import {fuseVerifiedSemantic,SEMANTIC_ROLLOUT,evaluateSemanticGate}
  from "../lib/discovery/semanticSearchV3.ts";

const data=JSON.parse(readFileSync(new URL("./fixtures/semantic-v3-category-proxy.json",import.meta.url),"utf8"));
test("research fixture explicitly prohibits confusing proxy and human relevance",()=>{
 assert.equal(data.human_judged,false);
 assert.equal(data.semantic_model_results_included,false);
 assert.equal(data.queries.length,240);
 assert.equal(data.candidates.length,22);
 assert.ok(data.queries.every(q=>q.judgment_basis==="category-proxy"&&
   q.review_status==="pending_native_speaker_review"));
});
test("five languages are equally represented in category-proxy fixture",()=>{
 const counts=new Map();
 for(const q of data.queries)counts.set(q.language,(counts.get(q.language)||0)+1);
 for(const lang of ["en","ta","si","ta-Latn","si-Latn"])assert.equal(counts.get(lang),48);
});
test("all proxy relevance IDs exist in the approved snapshot and are non-empty",()=>{
 const ids=new Set(data.candidates.map(row=>row.id));
 assert.equal(new Set(data.candidates.map(row=>row.id)).size,data.candidates.length);
 for(const q of data.queries){
  assert.ok(q.relevant_business_ids.length,q.query);
  assert.ok(q.relevant_business_ids.every(id=>ids.has(id)),q.query);
 }
});

test("semantic v3 disabled cannot alter HybridSearch v2 results",()=>{
 const docs=data.candidates.map((b,i)=>({...b,distance_meters:i*900+300,match_type:"category"}));
 const gate=evaluateSemanticGate({
  indexedApproved:0,totalApproved:docs.length,modelId:"",
  benchmarkNdcgV2:null,benchmarkNdcgV3:null,queryEmbeddingP95Ms:null,
  nativeLanguageJudgments:0,nativeLanguageQueryCount:0,reviewPassed:false
 });
 const queryCases=data.queries.slice(0,120);
 let ndcg=0,precision=0;
 for(const q of queryCases){
  const baseline=rankHybridSearch(docs,q.canonical_query,50000);
  const fallback=fuseVerifiedSemantic(baseline,[],SEMANTIC_ROLLOUT,gate);
  assert.deepEqual(fallback.map(x=>x.id),baseline.map(x=>x.id));
  const grades=q.relevant_business_ids.map(id=>({id,relevance:3}));
  ndcg+=ndcgAtK(fallback.map(x=>x.id),grades,10);
  precision+=precisionAtK(fallback.map(x=>x.id),grades,10);
 }
 console.log("SLBI_SEMANTIC_V3_RESEARCH_PROXY="+JSON.stringify({
  reviewed:false,categoryProxyQueries:queryCases.length,
  baselineMeanNdcgAt10:ndcg/queryCases.length,
  baselineMeanPrecisionAt10:precision/queryCases.length,
  semanticModelEvaluated:false,
  deploymentGate:"disabled"
 }));
});
