import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const repo=new URL("../../",import.meta.url);
const read=p=>fs.readFileSync(new URL(p,repo),"utf8");
test("ML06 consent and source lineage are safe and not live",()=>{
 const c=JSON.parse(read("ml/neurogrowth/contracts/ml06_observable_label_contract.json"));
 assert.equal(c.live_vendor_data_export,false);
 assert.equal(c.production_model_training,false);
 assert.equal(c.production_agent_execution,false);
 assert.equal(c.raw_rows_allowed_into_deepnote,false);
 assert.equal(c.candidate_labels.length,5);
 assert.match(c.active_release_gate,/BLOCKED/);
 assert.ok(c.schema_source_requirements.some(s=>s.source.includes("attribution.ts")));
 assert.ok(c.schema_source_requirements.some(s=>s.status.includes("live RLS")));
});
test("ML06 Python gate is synthetic allowlist and no source connector",()=>{
 const s=read("ml/neurogrowth/ml06_label_gate.py");
 assert.match(s,/PROVENANCE="mock_verified_history"/);
 assert.match(s,/BUSINESS_GROUP=re.compile/);
 assert.match(s,/owner_scoped/);
 assert.match(s,/observation_window_complete/);
 assert.match(s,/production_training_enabled":False/);
 assert.doesNotMatch(s,/SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|NEON_DATABASE_URL|create_client\(/);
});
