import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => readFileSync(new URL("../../" + name, import.meta.url), "utf8");
const decisions = JSON.parse(read("docs/growth/g0/exit/G0_OWNER_SCOPED_DECISIONS_20261124.json"));
const ledger = JSON.parse(read("docs/growth/g0/exit/G0_FOUNDATION_EXIT_LEDGER_20261123.json"));
test("four owner choices are scoped decisions, never G0 7/7 acceptance", () => {
  assert.equal(decisions.decision_type,"scoped_policy_authorization_not_phase_exit");
  assert.equal(decisions.g0_exit.owner_accepted_gates,0);
  assert.equal(decisions.g0_exit.total_gates,7);
  assert.equal(decisions.g0_exit.phase_exit_signoff,false);
  assert.equal(ledger.phase_exit.status,"BLOCKED");
  assert.equal(ledger.phase_exit.accepted,0);
  assert.ok(ledger.g0_gates.every(x=>x.status==="OPEN"));
});
test("read-only G1 authorization cannot be confused with live release approval", () => {
  const g1=decisions.decisions.g1_engineering;
  assert.equal(g1.decision,"APPROVED_PRODUCTION_DEPLOYMENT_OF_FINISHED_G1_INERT_CODE");
  assert.ok(g1.permitted.includes("main_branch_merge_of_tested_inert_modules"));
  assert.ok(g1.permitted.includes("automatic_vercel_production_code_only_deployment"));
  for(const required of ["live_db_migration",
    "provider_activation","production_data_reads_for_g1","production_writes","g1_live_api_or_page_activation_without_separate_review"]){
    assert.ok(g1.prohibited.includes(required));
  }
  assert.equal(decisions.decision_history[0].production_release,false);
  assert.equal(decisions.decision_history[1].production_release,true);
  const code=read("lib/growth/g1/read-only-knowledge.ts");
  assert.match(code,/owner_id !== requesterUserId/);
  assert.match(code,/business.status !== "approved"/);
  assert.doesNotMatch(code,/from ["'](?:@supabase|pg|node:fs|next\/|@\/lib\/supabase)/);
  assert.doesNotMatch(code,/(?:\.insert\(|\.update\(|\.delete\(|fetch\(|process\.env|createClient|service_role)/);
});
test("manual refunds and existing provider boundaries do not become automatic activation", () => {
  const d=decisions.decisions;
  assert.equal(d.wallet_refund.automatic_refunds,false);
  assert.equal(d.wallet_refund.automatic_wallet_credits,false);
  assert.equal(d.wallet_refund.application_enforcement_status,"UNVERIFIED_EXISTING_RUNTIME_MUST_BE_AUDITED");
  assert.equal(d.marketing_providers.new_provider_activation,false);
  assert.equal(d.marketing_providers.permission_expansion,false);
  assert.equal(d.desktop_gps.device_qa_status,"OPEN");
  assert.equal(d.desktop_gps.accepting_manual_location_as_closure,false);
});
