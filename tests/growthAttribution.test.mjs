import test from "node:test";
import assert from "node:assert/strict";
import {
  EXISTING_DISCOVERY_EVENTS,
  GROWTH_INGESTION_RELEASE_GATES,
  classifyLeadOrigin,
  summarizeGrowthMetrics,
} from "../lib/growth/attribution.ts";

test("Existing SLBI event taxonomy is preserved without silent new synthetic events",()=>{
  assert.deepEqual(EXISTING_DISCOVERY_EVENTS,["view","location_click","call_click","lead_form_submit"]);
});
test("Lead origins classify only verified legacy source names",()=>{
  assert.equal(classifyLeadOrigin("Business Detail Page"),"web_detail");
  assert.equal(classifyLeadOrigin(" mobile app - business details "),"mobile_detail");
  assert.equal(classifyLeadOrigin("someone typed social"),"other");
  assert.equal(classifyLeadOrigin(null),"other");
});
test("Analytics clicks and lead records are reported separately, never fake sales",()=>{
  const logs=[
    {event_type:"view"},{event_type:"view"},{event_type:"call_click"},
    {event_type:"location_click"},{event_type:"lead_form_submit"},
    {event_type:"unrecognized_future_event"},
  ];
  const leads=[
    {id:"1",status:"new",source:"Business Detail Page"},
    {id:"2",status:"converted",source:"Mobile App - Business Details"},
    {id:"2",status:"converted",source:"Mobile App - Business Details"},
    {id:"3",status:"contacted",source:"other"},
  ];
  const m=summarizeGrowthMetrics(logs,leads);
  assert.equal(m.listingViewEvents,2);
  assert.equal(m.callClickEvents,1);
  assert.equal(m.locationClickEvents,1);
  assert.equal(m.leadFormSubmitEvents,1);
  assert.equal(m.otherEventCount,1);
  assert.equal(m.crmLeadRecords,3);
  assert.equal(m.crmMarkedConverted,1);
  assert.deepEqual([m.leadsFromWebDetail,m.leadsFromMobileDetail,m.leadsFromOtherSources],[1,1,1]);
  assert.equal(m.verifiedSales,null);
  assert.equal(m.verifiedRevenue,null);
  assert.equal(m.uniqueVisitors,null);
});
test("No event-collection pipeline is considered ready without privacy and abuse gates",()=>{
  assert.ok(GROWTH_INGESTION_RELEASE_GATES.length>=7);
  assert.ok(GROWTH_INGESTION_RELEASE_GATES.some(g=>g.includes("RLS")));
  assert.ok(GROWTH_INGESTION_RELEASE_GATES.some(g=>g.includes("idempotency")));
});
