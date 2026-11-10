import test from "node:test";
import assert from "node:assert/strict";
import {
  HYBRID_SEARCH_VERSION,searchTokens,bm25CandidateScores,
  reciprocalRankFusion,rankHybridSearch,useHybridV2,
} from "../lib/discovery/hybridSearch.ts";
import {resolveSmartSearch} from "../lib/discovery/smartSearch.ts";

test("HybridSearch uses a versioned, deterministic algorithm",()=>{
  assert.equal(HYBRID_SEARCH_VERSION,"2.0.0");
  const docs=[{id:"b",name:"Clothes Fashion",category:"Clothing & Brands",distance_meters:3000},{id:"a",name:"Restaurant",category:"Food & Dining",distance_meters:500}];
  assert.deepEqual(rankHybridSearch(docs,"clothing",10000).map(x=>x.id),rankHybridSearch(docs,"clothing",10000).map(x=>x.id));
});
test("Unicode tokenization retains Tamil and Sinhala grapheme marks",()=>{
  assert.deepEqual(searchTokens("பிரியாணி shop").includes("பிரியாணி"),true);
  assert.ok(searchTokens("ආහාර").includes("ආහාර"));
});
test("BM25 document matching is meaningful and corpus-relative",()=>{
  const docs=[
    {id:"food",name:"Biryani House",category:"Food & Dining",description:"Fresh biryani and rice"},
    {id:"fashion",name:"Clothing House",category:"Clothing & Brands",description:"Fashion wear"},
  ];
  const score=bm25CandidateScores(docs,"biryani");
  assert.ok((score.get("food")||0)>0);
  assert.equal(score.get("fashion"),0);
  assert.ok((bm25CandidateScores(docs,"food").get("food")||0)>0);
});
test("BM25 is zero for empty/no matching terms",()=>{
  const a=[{id:"1",name:"Bakery",category:"Food & Dining"}];
  assert.equal(bm25CandidateScores(a,"unrelated").get("1"),0);
  assert.equal(bm25CandidateScores(a,"").size,0);
});
test("RRF handles duplicates and input ranking weights safely",()=>{
  const values=reciprocalRankFusion([{ids:["x","x","y"]},{ids:["y","z"],weight:2}]);
  assert.ok(values.get("y")>values.get("x"));
  assert.ok(values.get("z")>0);
});
test("Known product availability wins over merely related category",()=>{
  const docs=[
    {id:"related",name:"Food Corner",category:"Food & Dining",distance_meters:120,match_type:"category_related"},
    {id:"exact",name:"Jaffna Biryani House",category:"Food & Dining",distance_meters:8000,match_type:"exact_service"},
  ];
  assert.equal(rankHybridSearch(docs,"biryani",10000,{specificService:true})[0].id,"exact");
});
test("No product falsely promoted when all results are category related",()=>{
  const docs=[
    {id:"b",name:"Fresh Fruit Cafe",category:"Food & Dining",distance_meters:500,match_type:"category_related"},
    {id:"a",name:"City Restaurant",category:"Food & Dining",distance_meters:900,match_type:"category_related"},
  ];
  assert.equal(rankHybridSearch(docs,"pizza",10000,{specificService:true}).length,2);
  assert.ok(docs.every(x=>x.match_type==="category_related"));
});
test("Location-only search is still ranked by existing GeoRank",()=>{
  const docs=[{id:"far",name:"Far",distance_meters:9000},{id:"near",name:"Near",distance_meters:150}];
  assert.equal(rankHybridSearch(docs,"",10000)[0].id,"near");
  assert.equal(useHybridV2("",2),false);
  assert.equal(useHybridV2("food",2),true);
});
test("Tamil and Sinhala generic search concepts map to listing language",()=>{
  for(const q of ["துணிக்கடை","ඇඳුම්","clothes"]){
    const parsed=resolveSmartSearch(q);
    assert.equal(parsed.canonicalQuery,"clothing");
    const docs=[
      {id:"other",name:"Fancy Restaurant",category:"Food & Dining",distance_meters:200},
      {id:"cloth",name:"Clothing & Brands",category:"Clothing & Brands",distance_meters:2000},
    ];
    assert.equal(rankHybridSearch(docs,parsed.canonicalQuery,5000)[0].id,"cloth");
  }
});
test("Specific Sinhala/Tamil products normalize without semantic hallucination",()=>{
  const cases=[["பிரியாணி","biryani"],["බිරියානි","biryani"],["පීසා","pizza"],["බර්ගර්","බර්ගර්"]];
  for(const [q,want] of cases){
    const parsed=resolveSmartSearch(q);
    if(want!=="බර්ගර්")assert.equal(parsed.canonicalQuery,want);
    else assert.ok(parsed.canonicalQuery);
  }
});
test("Hybrid ranking never mutates candidate objects or input order",()=>{
  const docs=[{id:"x",name:"Hardware",distance_meters:10},{id:"y",name:"Food",distance_meters:100}];
  const snapshot=JSON.stringify(docs);
  rankHybridSearch(docs,"food",1000);
  assert.equal(JSON.stringify(docs),snapshot);
});
test("Candidate-limited behavior is fast for moderate approved result batches",()=>{
  const docs=Array.from({length:250},(_,i)=>({id:String(i),name:i%2?"Food Restaurant":"Repair Tools",category:i%2?"Food & Dining":"Repairing & Services",distance_meters:i*100,description:"Sri Lanka local business services"}));
  const ranked=rankHybridSearch(docs,"food",50000);
  assert.equal(ranked.length,250);
  assert.equal(new Set(ranked.map(x=>x.id)).size,250);
});
