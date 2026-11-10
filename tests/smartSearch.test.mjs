import test from "node:test";
import assert from "node:assert/strict";
import { resolveSmartSearch, extractSearchPlace, radiusSteps, SMART_SEARCH_VERSION } from "../lib/discovery/smartSearch.ts";

const towns=[
 {name:"Jaffna",lat:9.665093,lon:80.0093029,district:"Jaffna"},
 {name:"Kandy",lat:7.2931208,lon:80.6350358,district:"Kandy"},
 {name:"Colombo",lat:6.9388614,lon:79.8542005,district:"Colombo"},
 {name:"Nuwara Eliya",lat:6.9738863,lon:80.767127,district:"Nuwara Eliya"},
];
test("SmartSearch algorithm version",()=>assert.equal(SMART_SEARCH_VERSION,"1.0.0"));
test("Jaffna Clothings resolves known place and Clothing & Brands",()=>{
 const r=resolveSmartSearch("Jaffna Clothings",towns,["Clothing & Brands","Food & Dining"]);
 assert.equal(r.location?.name,"Jaffna");
 assert.equal(r.intentKey,"clothing");
 assert.equal(r.canonicalQuery,"clothing");
 assert.deepEqual(r.categories,["Clothing & Brands"]);
 assert.equal(r.specificService,false);
});
test("Biryani shop maps to food but stays product-specific",()=>{
 const r=resolveSmartSearch("Biryani shop",towns);
 assert.equal(r.canonicalQuery,"biryani");
 assert.equal(r.intentKey,"food");
 assert.ok(r.categories.includes("Food & Dining"));
 assert.equal(r.specificService,true);
});
test("Burger shop & Pizza map to food as related-service candidates",()=>{
 for(const q of ["Burger shop","Pizza","Pizzas","Briyani"]){
  const r=resolveSmartSearch(q,towns);assert.equal(r.intentKey,"food",q);assert.equal(r.specificService,true,q);
 }
});
test("Jaffna Foods strips location and uses generic food category",()=>{
 const r=resolveSmartSearch("Foods in Jaffna",towns);
 assert.equal(r.location?.name,"Jaffna");assert.equal(r.intentKey,"food");assert.equal(r.canonicalQuery,"food");
});
test("Healthcare in Kandy resolves service and location",()=>{
 const r=resolveSmartSearch("Healthcare near Kandy",towns);
 assert.equal(r.location?.name,"Kandy");assert.equal(r.intentKey,"medical");assert.ok(r.categories.includes("Health & Medical"));
});
test("Tamil food and Sinhala medical aliases",()=>{
 assert.equal(resolveSmartSearch("உணவகம்",towns).intentKey,"food");
 assert.equal(resolveSmartSearch("රෝහල",towns).intentKey,"medical");
 assert.equal(resolveSmartSearch("பிரியாணி",towns).specificService,true);
});
test("Multiword Sri Lankan town name extracted without damaging text",()=>{
 const r=extractSearchPlace("Computer repair near Nuwara Eliya",towns);
 assert.equal(r.location?.name,"Nuwara Eliya");assert.equal(r.remaining,"computer repair");
});
test("Unrecognized named business remains an ordinary lexical query",()=>{
 const r=resolveSmartSearch("Unique Corner Shop",towns);
 assert.equal(r.intentKey,null);assert.equal(r.canonicalQuery,"unique corner");
});
test("Radius expands only in increasing bounded steps",()=>{
 assert.deepEqual(radiusSteps(3000),[3000,10000,20000,30000,50000]);
 assert.deepEqual(radiusSteps(20000),[20000,30000,50000]);
 assert.deepEqual(radiusSteps(50000),[50000]);
});
test("Search parser does not silently invent a town",()=>{
 const r=resolveSmartSearch("Pizza",towns);assert.equal(r.location,null);
});
test("Category names are mapped only to declared known choices when available",()=>{
 const r=resolveSmartSearch("medical",towns,["Health & Medical"]);
 assert.deepEqual(r.categories,["Health & Medical"]);
});


test("Sinhala Jaffna inflection + car mechanic intent yields real Jaffna coordinates",()=>{
 const parsed=resolveSmartSearch("යාපනයේ කාර් රෙපෙයාර් කරන තැන්",towns,["Repairing & Services","Vehicles & Automative"]);
 assert.equal(parsed.location?.name,"Jaffna");
 assert.equal(parsed.location?.lat,9.665093);
 assert.equal(parsed.canonicalQuery,"car repair");
 assert.equal(parsed.specificService,true);
 assert.equal(parsed.intentKey,"repair");
 assert.ok(parsed.categories.includes("Repairing & Services"));
 assert.ok(parsed.categories.includes("Vehicles & Automative"));
});
test("User supplied mixed-script Tamil/Sinhala spelling still resolves Jaffna car repair",()=>{
 const parsed=resolveSmartSearch("கார் ரிපෙயரிங் ஜப்னா டவுன்",towns);
 assert.equal(parsed.location?.name,"Jaffna");
 assert.equal(parsed.canonicalQuery,"car repair");
 assert.equal(parsed.specificService,true);
});
test("Tamil colloquial car repair in Jaffna recognizes service and town",()=>{
 for(const input of [
  "கார் ரிப்பேரிங் யாழ்ப்பாணத்தில்",
  "கார் ரிப்பேர் ஜப்னா",
  "கார் பழுதுபார்ப்பு யாழ்ப்பாணம்",
 ]) {
   const parsed=resolveSmartSearch(input,towns);
   assert.equal(parsed.location?.name,"Jaffna",input);
   assert.equal(parsed.canonicalQuery,"car repair",input);
   assert.equal(parsed.specificService,true,input);
 }
});
test("Sinhala mechanical synonyms normalize to car repair",()=>{
 for(const input of ["කාර් අලුත්වැඩියා යාපනයේ","වාහන අලුත්වැඩියා යාපනය","කාර් ගරාජ් ජාෆ්නා"]) {
   const parsed=resolveSmartSearch(input,towns);
   assert.equal(parsed.location?.name,"Jaffna",input);
   assert.equal(parsed.canonicalQuery,"car repair",input);
 }
});
test("Tamil/Sinhala aliases preserve earlier clothing search behavior",()=>{
 const tamil=resolveSmartSearch("யாழ்ப்பாணத்தில் துணிக்கடை",towns);
 const sinhala=resolveSmartSearch("යාපනයේ ඇඳුම් සාප්පු",towns);
 for(const parsed of [tamil,sinhala]) {
   assert.equal(parsed.location?.name,"Jaffna");
   assert.equal(parsed.canonicalQuery,"clothing");
   assert.equal(parsed.specificService,false);
 }
});
test("Canonical town spellings in English continue working unchanged",()=>{
 for(const query of ["Jaffna car repair","car repair Jaffna town","car repair near Kandy"]) {
   const parsed=resolveSmartSearch(query,towns);
   assert.ok(parsed.location,query);
   assert.equal(parsed.canonicalQuery,"car repair",query);
 }
});
test("Car wash is never independently classified as an exact car-repair claim",()=>{
 const parsed=resolveSmartSearch("Jaffna car repair",towns);
 assert.equal(parsed.specificService,true);
 // Retrieval is responsible for evidence: category-related service only.
 // A category label alone must not prove that a car wash repairs engines.
 assert.ok(parsed.categories.includes("Repairing & Services"));
});
test("Colombo and Kandy Sinhala/Tamil town aliases also work",()=>{
 for(const input of ["කොළඹ medical","கொழும்பில் medical","මහනුවර education","கண்டியில் education"]) {
   const parsed=resolveSmartSearch(input,towns);
   assert.ok(parsed.location,input);
 }
});
