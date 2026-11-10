import test from "node:test";
import assert from "node:assert/strict";
import {boundedEditDistance,findIntentCorrection,findTownCorrection,SEARCH_CORRECTIONS_VERSION}
  from "../lib/discovery/searchCorrections.ts";
import {resolveSmartSearch} from "../lib/discovery/smartSearch.ts";

const places=[
  {name:"Jaffna",lat:9.665093,lon:80.0093029,district:"Jaffna"},
  {name:"Colombo",lat:6.9271,lon:79.8612,district:"Colombo"},
  {name:"Kandy",lat:7.29,lon:80.63,district:"Kandy"},
];
const entry=(alias,kind,canonical,language="en",categories=[],specific=false,town=null)=>({
  alias,alias_kind:kind,canonical_query:canonical,intent_key:canonical.replace(/\s+/g,"_"),
  language,categories,specific_service:specific,town_name:town,
});
const dictionary=[
  entry("jaffna","location","jaffna","en",[],false,"Jaffna"),
  entry("jafna","location","jaffna","en",[],false,"Jaffna"),
  entry("colombo","location","colombo","en",[],false,"Colombo"),
  entry("කොළඹ","location","colombo","si",[],false,"Colombo"),
  entry("biryani shop","service","biryani","en",["Food & Dining"],true),
  entry("briyani","service","biryani","en",["Food & Dining"],true),
  entry("பிரியாணி","service","biryani","ta",["Food & Dining"],true),
  entry("pizza","service","pizza","en",["Food & Dining"],true),
  entry("car wash","service","car wash","en",["Repairing & Services"],true),
  entry("car repair","service","car repair","en",["Repairing & Services","Vehicles & Automative"],true),
  entry("thuni kadai","category","clothing","ta-Latn",["Clothing & Brands"]),
  entry("adum kade","category","clothing","si-Latn",["Clothing & Brands"]),
  entry("tution center","category","education","ta-Latn",["Educational institutes & Services"]),
  entry("கார் ரிப்பேரிங்","service","car repair","ta",["Repairing & Services"],true),
  entry("ඇඳුම් සාප්පු","category","clothing","si",["Clothing & Brands"]),
];
test("Correction algorithm version",()=>assert.equal(SEARCH_CORRECTIONS_VERSION,"1.0.0"));
test("Levenshtein budget operates on Unicode codepoints",()=>{
  assert.equal(boundedEditDistance("car repair","car repiar",2),2);
  assert.equal(boundedEditDistance("பிரியாணி","பிரியானி",2),1);
  assert.ok(boundedEditDistance("car wash","car repair",2)>2);
});
test("Jaffna biryani typo keeps food service",()=>{
  const r=resolveSmartSearch("briyan i shop Jaffna",places,undefined,dictionary);
  // This is intentionally too many changes: don't guess.
  assert.equal(r.location?.name,"Jaffna");
  assert.ok(!r.correction);
});
test("One-character biryani typo auto-corrects only with high confidence",()=>{
 const r=resolveSmartSearch("briyanni shop Jaffna",places,undefined,dictionary);
 assert.equal(r.location?.name,"Jaffna");
 assert.equal(r.canonicalQuery,"biryani");
 assert.equal(r.specificService,true);
 assert.equal(r.correction?.strategy,"typo");
});
test("Tamil-script typo in rice dish resolves through reviewed dictionary",()=>{
 const r=resolveSmartSearch("பிரியானி Jaffna",places,undefined,dictionary);
 assert.equal(r.canonicalQuery,"biryani");
 assert.equal(r.specificService,true);
});
test("Thanglish variants thunikadai and tuni kadai",()=>{
 for(const phrase of ["thunikadai","tuni kadai","thuni kadai"]){
  const r=resolveSmartSearch(phrase+" Jaffna",places,undefined,dictionary);
  assert.equal(r.canonicalQuery,"clothing",phrase);
  assert.equal(r.location?.name,"Jaffna",phrase);
  assert.equal(r.specificService,false);
 }
});
test("Singlish spelling adum kadey corrected to clothing",()=>{
 const r=resolveSmartSearch("adum kadey Jaffna",places,undefined,dictionary);
 assert.equal(r.canonicalQuery,"clothing");
 assert.equal(r.intentKey,"clothing");
});
test("Jaffna town typo does not affect exact car repair intent",()=>{
 const r=resolveSmartSearch("jafnna car repair",places,undefined,dictionary);
 assert.equal(r.location?.name,"Jaffna");
 assert.equal(r.canonicalQuery,"car repair");
});
test("Car wash and mechanic remain distinct even with a typo",()=>{
 const wash=resolveSmartSearch("car waash Jaffna",places,undefined,dictionary);
 const mechanic=resolveSmartSearch("car repiar Jaffna",places,undefined,dictionary);
 assert.equal(wash.canonicalQuery,"car wash");
 assert.equal(mechanic.canonicalQuery,"car repair");
 assert.equal(wash.specificService,true);
 assert.equal(mechanic.specificService,true);
});
test("Existing exact multilingual aliases always beat approximate results",()=>{
 for(const phrase of ["ඇඳුම් සාප්පු","கார் ரிப்பேரிங்"]){
  const r=resolveSmartSearch(phrase+" Jaffna",places,undefined,dictionary);
  assert.equal(r.location?.name,"Jaffna");
  assert.equal(r.correction,undefined);
 }
});
test("Short and ambiguous strings never trigger fuzzy search",()=>{
 assert.equal(findIntentCorrection("car",dictionary),null);
 assert.equal(findIntentCorrection("fooo",dictionary),null);
 const ambiguous=[
  entry("medical","category","medical"),
  entry("media","category","media"),
 ];
 assert.equal(findIntentCorrection("medial",ambiguous),null);
});
test("Unknown business name is never rewritten into an unrelated category",()=>{
 const r=resolveSmartSearch("Unique Hardware Professionals Jaffna",places,undefined,dictionary);
 assert.equal(r.location?.name,"Jaffna");
 assert.equal(r.intentKey,null);
 assert.equal(r.correction,undefined);
});
test("Explicit location alias always wins over fuzzy location",()=>{
 const r=resolveSmartSearch("jafna car repair",places,undefined,dictionary);
 assert.equal(r.location?.name,"Jaffna");
 assert.equal(r.correction,undefined);
});
test("Fuzzy matcher never fabricates a town from missing geographical data",()=>{
 const r=resolveSmartSearch("jafnna car repair",[],undefined,dictionary);
 assert.equal(r.location,null);
});
test("Correction performance with up to 1000 aliases is bounded",()=>{
 const more=Array.from({length:985},(_,i)=>
  entry("special word "+String(i).padStart(4,"0"),"category","unknown", "en",["Other"]));
 const all=[...dictionary,...more];
 const start=performance.now();
 const r=resolveSmartSearch("briyanni shop Jaffna",places,undefined,all);
 assert.equal(r.canonicalQuery,"biryani");
 assert.ok(performance.now()-start<2000);
});
