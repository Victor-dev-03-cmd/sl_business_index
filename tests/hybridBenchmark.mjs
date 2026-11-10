/**
 * SLBI HybridSearch v2 offline benchmark (synthetic approved-listing fixture).
 * 168 English/Tamil/Sinhala queries, independent expected category judgments.
 * Synthetic results are NOT a substitute for human-labeled live relevance data.
 */
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {resolveSmartSearch} from "../lib/discovery/smartSearch.ts";
import {rankHybridSearch} from "../lib/discovery/hybridSearch.ts";
import {sortGeoRank} from "../lib/discovery/geoRank.ts";
import {precisionAtK,ndcgAtK} from "../lib/discovery/searchEvaluation.ts";

const towns=[{name:"Jaffna",lat:9.665093,lon:80.0093029},{name:"Kandy",lat:7.29,lon:80.63}];
const listings=[
 {id:"food",name:"Local Food Restaurant",category:"Food & Dining",description:"Restaurants food dining cafe biryani burger pizza fresh meals",distance_meters:3100,match_type:"category"},
 {id:"clothing",name:"Clothing Apparel Boutique",category:"Clothing & Brands",description:"Fashion garments clothing dresses shirts textile brand and outfits",distance_meters:3700,match_type:"category"},
 {id:"medical",name:"City Medical Clinic",category:"Health & Medical",description:"Medical healthcare hospital doctors pharmacy and clinical services",distance_meters:4250,match_type:"category"},
 {id:"retail",name:"Community Shopping Market",category:"Shopping & Retail",description:"Retail shopping supermarket grocery and daily essentials",distance_meters:5200,match_type:"category"},
 {id:"education",name:"City Education Academy",category:"Educational institutes & Services",description:"Education school tuition classes teaching training institute",distance_meters:6000,match_type:"category"},
 {id:"travel",name:"Lanka Travel Tourism",category:"Travel & Tourism",description:"Travel transport tourism tours buses taxi and holiday services",distance_meters:7500,match_type:"category"},
 {id:"repair",name:"Home Repair Services",category:"Repairing & Services",description:"Repair mechanic plumber electrician maintenance services",distance_meters:5500,match_type:"category"},
 {id:"general",name:"Prime Professional Office",category:"Professional Services",description:"Professional consulting office digital website design",distance_meters:80,match_type:"lexical"},
 {id:"events",name:"Islandwide Celebrations",category:"Event Planner",description:"Wedding celebrations cake party and conference planning",distance_meters:300,match_type:"lexical"},
 {id:"media",name:"Digital Media House",category:"Media & Communications",description:"Video photography advertising printing and media",distance_meters:125,match_type:"lexical"},
];

const categories=[
 ["clothing",["clothing","clothings","clothes","fashion","boutique","ஆடைகள்","உடைகள்","ඇඳුම්"]],
 ["food",["food","foods","restaurant","dining","உணவகம்","உணவு","ආහාර","අවන්හල"]],
 ["medical",["medical","health","hospital","clinic","மருத்துவம்","மருத்துவமனை","රෝහල","වෛද්‍ය"]],
 ["retail",["shopping","retail","supermarket","grocery","மளிகை","கடைகள்","සාප්පු","වෙළඳසැල"]],
 ["education",["education","school","tuition","academy","பாடசாலை","கல்வி","පාසල","අධ්‍යාපන"]],
 ["travel",["travel","tourism","transport","taxi","பயணம்","சுற்றுலா","ගමන්","සංචාරක"]],
 ["repair",["repair","electrician","mechanic","plumber","பழுதுபார்ப்பு","மின்சார வேலை","අලුත්වැඩියා","repairs"]],
];
const suffixes=[""," in Jaffna"," near Kandy"];
const cases=categories.flatMap(([expected,phrases])=>phrases.flatMap(phrase=>suffixes.map(suffix=>({expected,raw:phrase+suffix}))));
assert.equal(cases.length,168);
let oldNdcg=0,newNdcg=0,oldPrecision=0,newPrecision=0,topOneOld=0,topOneNew=0;
const timings=[];
for(const scenario of cases){
 const parsed=resolveSmartSearch(scenario.raw,towns);
 // Labels come from the benchmark listing's independently assigned group.
 const judgments=[{id:scenario.expected,relevance:3}];
 const query=parsed.canonicalQuery;
 const old=sortGeoRank(listings,query,20000).map(x=>x.id);
 const start=performance.now();
 const ranked=rankHybridSearch(listings,query,20000).map(x=>x.id);
 timings.push(performance.now()-start);
 oldNdcg+=ndcgAtK(old,judgments,3);
 newNdcg+=ndcgAtK(ranked,judgments,3);
 oldPrecision+=precisionAtK(old,judgments,3);
 newPrecision+=precisionAtK(ranked,judgments,3);
 topOneOld+=Number(old[0]===scenario.expected);
 topOneNew+=Number(ranked[0]===scenario.expected);
}
const n=cases.length;
const round=x=>Number((x/n).toFixed(4));
timings.sort((a,b)=>a-b);
const report={
 benchmark:"synthetic-fixture-v1",
 evaluationCases:n,
 languageGroups:["English","Tamil","Sinhala"],
 baseline:{ndcgAt3:round(oldNdcg),precisionAt3:round(oldPrecision),top1Accuracy:round(topOneOld)},
 hybridV2:{ndcgAt3:round(newNdcg),precisionAt3:round(newPrecision),top1Accuracy:round(topOneNew)},
 localP95RankingMs:Number(timings[Math.ceil(n*.95)-1].toFixed(2)),
 limitations:["Synthetic fixture only","Candidate-stage BM25, not global indexed BM25","No embedding model or live query judgments"],
};
console.log("SLBI_HYBRID_BENCHMARK="+JSON.stringify(report));
assert.ok(Number.isFinite(report.hybridV2.ndcgAt3));
assert.ok(report.hybridV2.ndcgAt3>=report.baseline.ndcgAt3-.015,
  "Hybrid v2 must not degrade nDCG@3 against GeoRank baseline in this synthetic suite");
assert.ok(report.hybridV2.top1Accuracy>=report.baseline.top1Accuracy-.015,
  "Hybrid v2 must not degrade top-1 result accuracy");
