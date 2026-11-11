import test from "node:test";
import assert from "node:assert/strict";
import { E5_BETA } from "../lib/discovery/semantic-v3-beta-vectors.ts";
import { E5_BETA_MODEL, E5_BETA_REVISION, hasSupportedE5BetaIntent, rankSemanticV3Beta } from "../lib/discovery/semanticBetaV3.ts";

const sample = E5_BETA.businesses.slice(0,5).map((row) => ({
  id: row.id, name: row.name, category: row.category, match_type: "category"
}));
const rank = (items, query, optedIn = true, specificService = false) =>
  rankSemanticV3Beta(items, query, { optedIn, specificService });

test("real pinned model provenance and complete 22-listing research snapshot", () => {
  assert.equal(E5_BETA.model_id, E5_BETA_MODEL);
  assert.equal(E5_BETA.model_revision, E5_BETA_REVISION);
  assert.equal(E5_BETA.dimensions, 384);
  assert.equal(E5_BETA.encoding, "int8-base64-normalized");
  assert.equal(E5_BETA.dataset_label_type, "category-proxy-not-human-judged");
  assert.equal(E5_BETA.businesses.length, 22);
  assert.equal(new Set(E5_BETA.businesses.map(x=>x.id)).size, 22);
  assert.equal(new Set(E5_BETA.canonical_queries.map(x=>x.query)).size, E5_BETA.canonical_queries.length);
  assert.ok(E5_BETA.canonical_queries.length >= 1);
  for (const row of [...E5_BETA.businesses, ...E5_BETA.canonical_queries]) {
    assert.equal(atob(row.vector).length, 384);
  }
});
test("V3 OFF leaves HybridSearch V2 ordering unchanged",()=>{
  assert.deepEqual(rank(sample,"education",false).items,sample);
  assert.equal(rank(sample,"education",false).active,false);
});
test("Unsupported queries fail closed rather than inventing semantic vectors",()=>{
  const x=rank(sample,"a totally new arbitrary intent");
  assert.deepEqual(x.items,sample);
  assert.equal(x.active,false);
  assert.equal(x.reason,"unsupported-intent");
});
test("Only the approved, eligible shortlist may be re-ordered",()=>{
  const q=E5_BETA.canonical_queries[0].query;
  assert.equal(hasSupportedE5BetaIntent(q),true);
  const res=rank(sample,q);
  assert.equal(res.active,true);
  assert.deepEqual(new Set(res.items.map(x=>x.id)),new Set(sample.map(x=>x.id)));
  assert.equal(res.items.length,sample.length);
});
test("Stale snapshots and missing approved ID coverage fall back to V2",()=>{
  const q=E5_BETA.canonical_queries[0].query;
  const stale=sample.map(x=>({...x}));
  stale[0].category="Unreviewed invented category";
  const res=rank(stale,q);
  assert.equal(res.active,false);
  assert.deepEqual(res.items,stale);
  assert.equal(res.reason,"stale-or-incomplete-index");
});
test("Exact-service evidence takes priority over pure cosine similarity",()=>{
  const q=E5_BETA.canonical_queries[0].query;
  const candidates=sample.map(row=>({...row,match_type:"category_related"}));
  candidates[0].match_type="exact_service";
  const res=rank(candidates,q,true,true);
  assert.equal(res.active,true);
  assert.equal(res.items[0].id,candidates[0].id);
});
