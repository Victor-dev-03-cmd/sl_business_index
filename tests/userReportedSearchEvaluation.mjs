/**
 * Explicitly user-reported SLBI search phrases: parser evaluation only.
 * These are NOT human-graded business-level relevance labels, conversion
 * metrics, or evidence that semantic embeddings are production-ready.
 */
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {resolveSmartSearch} from "../lib/discovery/smartSearch.ts";
const places=[
 {name:"Jaffna",lat:9.665093,lon:80.0093029,district:"Jaffna"},
 {name:"Colombo",lat:6.9271,lon:79.8612,district:"Colombo"},
];
const entry=(alias,kind,canonical,cat=[],service=false,town=null,language="en")=>({
 alias,alias_kind:kind,canonical_query:canonical,intent_key:canonical.replace(/\s+/g,"_"),
 specific_service:service,categories:cat,town_name:town,language
});
const dictionary=[
 entry("thuni kadai","category","clothing",["Clothing & Brands"],false,null,"ta-Latn"),
 entry("adum kade","category","clothing",["Clothing & Brands"],false,null,"si-Latn"),
 entry("biryani shop","service","biryani",["Food & Dining"],true),
 entry("burger shop","service","burger",["Food & Dining"],true),
 entry("கார் ரிපෙයරிங்","service","car repair",["Repairing & Services"],true,null,"mixed"),
 entry("கார் ரிපෙයරிங்","service","car repair",["Repairing & Services"],true,null,"mixed"),
 entry("jafna","location","jaffna",[],false,"Jaffna"),
];
const cases=[
 {query:"Jaffna Clothings",key:"clothing",place:"Jaffna"},
 {query:"Jaffna Foods",key:"food",place:"Jaffna"},
 {query:"Biryani shop",key:"biryani",place:null},
 {query:"Burger shop",key:"burger",place:null},
 {query:"Pizza",key:"pizza",place:null},
 {query:"Foods",key:"food",place:null},
 {query:"යාපනයේ ඇඳුම් සාප්පු",key:"clothing",place:"Jaffna"},
 {query:"යාපනයේ කාර් රෙපෙයාර් කරන තැන්",key:"car repair",place:"Jaffna"},
 {query:"கார் ரிපෙයරிங் ஜப்னா டவுன்",key:"car repair",place:"Jaffna"},
 {query:"யாழ்ப்பாணத்தில் துணிக்கடை",key:"clothing",place:"Jaffna"},
 {query:"பிரியாணி",key:"biryani",place:null},
 {query:"බිරියානි",key:"biryani",place:null},
];
let intentPass=0,placePass=0;
const start=performance.now();
for(const c of cases){
 const r=resolveSmartSearch(c.query,places,undefined,dictionary);
 intentPass+=Number(r.canonicalQuery===c.key);
 placePass+=Number((r.location?.name||null)===c.place);
 if(r.canonicalQuery!==c.key || (r.location?.name||null)!==c.place){
  console.error("MISMATCH",JSON.stringify({query:c.query,expected:c,got:r}));
 }
}
const report={
 dataset:"slbi-user-reported-intent-cases",
 cases:cases.length,
 intentAccuracy:intentPass/cases.length,
 locationAccuracy:placePass/cases.length,
 elapsedMs:Number((performance.now()-start).toFixed(2)),
 limitations:[
  "Parser intent/location labels only; no business-level relevance judgments",
  "Case count small and not representative of all dialects",
  "No embedding model evaluated"
 ],
};
console.log("SLBI_REAL_QUERY_INTENT_EVAL="+JSON.stringify(report));
assert.equal(intentPass,cases.length);
assert.equal(placePass,cases.length);
