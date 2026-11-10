import test from "node:test";
import assert from "node:assert/strict";
import {resolveSmartSearch} from "../lib/discovery/smartSearch.ts";

// Representative approved rows; the full 679-row dataset is in the versioned
// Supabase SQL migration and verified with an anon-role database read query.
const places=[
  {name:"Jaffna",lat:9.665093,lon:80.0093029,district:"Jaffna"},
  {name:"Negombo",lat:7.2083,lon:79.8358,district:"Gampaha"},
  {name:"Galle",lat:6.0535,lon:80.221,district:"Galle"},
];
const entry=(alias,kind,canonical,options={})=>({
 alias,alias_kind:kind,canonical_query:canonical,intent_key:options.key||canonical.replace(/\s+/g,"_"),
 categories:options.categories||[],specific_service:options.specific||false,
 town_name:options.town||null,
});
const dict=[
 entry("meegamuwa","location","negombo",{town:"Negombo"}),
 entry("ජාෆ්නා","location","jaffna",{town:"Jaffna"}),
 entry("ගාල්ලේ","location","galle",{town:"Galle"}),
 entry("adum kade","category","clothing",{categories:["Clothing & Brands"]}),
 entry("thuni kadai","category","clothing",{categories:["Clothing & Brands"]}),
 entry("ෆෝන් රෙපෙයාර්","service","phone repair",{categories:["Repairing & Services"],specific:true}),
 entry("පීසා කඩ","service","pizza",{categories:["Food & Dining"],specific:true}),
 entry("burger kade","service","burger",{categories:["Food & Dining"],specific:true}),
 entry("කාර් වොෂ්","service","car wash",{categories:["Repairing & Services"],specific:true}),
 entry("car repair","service","car repair",{categories:["Repairing & Services"],specific:true}),
];

test("Database dictionary adds Singlish clothing alias not present in built-in aliases",()=>{
 const parsed=resolveSmartSearch("adum kade Jaffna",places,undefined,dict);
 assert.equal(parsed.location?.name,"Jaffna");
 assert.equal(parsed.canonicalQuery,"clothing");
 assert.equal(parsed.intentKey,"clothing");
 assert.deepEqual(parsed.categories,["Clothing & Brands"]);
});
test("Database dictionary resolves Singlish town nickname with Sinhala food alias",()=>{
 const parsed=resolveSmartSearch("burger kade meegamuwa",places,undefined,dict);
 assert.equal(parsed.location?.name,"Negombo");
 assert.equal(parsed.canonicalQuery,"burger");
 assert.equal(parsed.specificService,true);
});
test("DB lookup supports Galle inflection and Sinhala phone repair",()=>{
 const parsed=resolveSmartSearch("ගාල්ලේ ෆෝන් රෙපෙයාර්",places,undefined,dict);
 assert.equal(parsed.location?.name,"Galle");
 assert.equal(parsed.canonicalQuery,"phone repair");
 assert.equal(parsed.specificService,true);
});
test("Pizza shop intent is a specific product, not a category-wide guarantee",()=>{
 const parsed=resolveSmartSearch("පීසා කඩ ජාෆ්නා",places,undefined,dict);
 assert.equal(parsed.location?.name,"Jaffna");
 assert.equal(parsed.canonicalQuery,"pizza");
 assert.equal(parsed.specificService,true);
});
test("Car wash and car repair stay distinct even inside repair category",()=>{
 const wash=resolveSmartSearch("කාර් වොෂ් ජාෆ්නා",places,undefined,dict);
 const repair=resolveSmartSearch("car repair Jaffna",places,undefined,dict);
 assert.equal(wash.canonicalQuery,"car wash");
 assert.equal(repair.canonicalQuery,"car repair");
 assert.notEqual(wash.canonicalQuery,repair.canonicalQuery);
});
test("No dictionary still uses original static safe parser",()=>{
 const parsed=resolveSmartSearch("යාපනයේ கார் ரிපෙයரிங்",places);
 assert.equal(parsed.location?.name,"Jaffna");
 assert.equal(parsed.canonicalQuery,"car repair");
});
test("Unknown searches are not silently interpreted as another service",()=>{
 const parsed=resolveSmartSearch("secret unique gadget custom service",places,undefined,dict);
 assert.equal(parsed.intentKey,null);
 assert.equal(parsed.canonicalQuery,"secret unique gadget custom");
});
test("Array inputs are immutable and deterministic",()=>{
 const before=JSON.stringify(dict);
 const a=resolveSmartSearch("adum kade",places,undefined,dict);
 const b=resolveSmartSearch("adum kade",places,undefined,dict);
 assert.deepEqual(a,b);
 assert.equal(JSON.stringify(dict),before);
});
test("Longer aliases take priority to preserve product specificity",()=>{
 const extended=[...dict,
  entry("car","category","travel",{categories:["Travel & Tourism"]}),
  entry("car repair","service","car repair",{categories:["Repairing & Services"],specific:true}),
 ];
 const parsed=resolveSmartSearch("car repair Jaffna",places,undefined,extended);
 assert.equal(parsed.canonicalQuery,"car repair");
 assert.equal(parsed.specificService,true);
});
