import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rankSemanticV3Beta } from "../lib/discovery/semanticBetaV3.ts";
import { E5_BETA } from "../lib/discovery/semantic-v3-beta-vectors.ts";

const nearby = readFileSync(new URL("../app/nearby/NearbyExplorer.tsx", import.meta.url), "utf8");

test("Nearby permanently enables V3 without URL flags or user toggle", () => {
  assert.match(nearby, /optedIn:\s*true/);
  assert.match(nearby, /Semantic V3 Beta · ON/);
  assert.doesNotMatch(nearby, /semanticBetaEnabled|setSemanticBetaEnabled/);
  assert.doesNotMatch(nearby, /searchParams\.get\(["']v3["']\)/);
  assert.doesNotMatch(nearby, /onClick=\{\(\) => setSemanticBetaEnabled/);
});

test("V3 remains candidate-scoped and falls back to V2 for unknown intents", () => {
  const docs = E5_BETA.businesses.slice(0,3).map(({id,name,category}) => ({
    id, name, category, match_type:"category",
  }));
  const unsupported = rankSemanticV3Beta(docs, "unknown arbitrary semantic intent", {optedIn:true});
  assert.equal(unsupported.active, false);
  assert.deepEqual(unsupported.items, docs);
  assert.equal(unsupported.reason, "unsupported-intent");
  const known = rankSemanticV3Beta(docs, "food", {optedIn:true});
  assert.deepEqual(new Set(known.items.map(row=>row.id)), new Set(docs.map(row=>row.id)));
  assert.equal(known.items.length, docs.length);
});

test("V3 is best-match only and other sorts stay distinct", () => {
  assert.match(nearby, /if \(sortBy === "best-match"\)/);
  assert.match(nearby, /V3 applies to Best match only/);
  assert.match(nearby, /HybridSearch v2 \/ GeoRank fallback/);
});
