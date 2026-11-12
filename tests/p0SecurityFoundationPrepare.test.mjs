import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const root = "../docs/growth/p0/";
const read = file => readFileSync(new URL(root + file, import.meta.url), "utf8");
const staged = read("P0_SECURITY_STAGE_REVIEW_ONLY.sql");
const assertions = read("P0_SECURITY_STAGE_ASSERTIONS.sql");
const rollback = read("P0_GUARD_CONTINGENCY_STAGING_ONLY.sql");
const runbook = read("README.md");

test("stage changes never live in auto-applied migrations and retain required policies",()=>{
  assert.match(staged,/REVIEW ONLY/);
  assert.match(staged,/DROP POLICY IF EXISTS "Temporary Public View" ON public\.businesses/);
  assert.match(staged,/Approved businesses public/);
  assert.match(staged,/Owners view own/);
  assert.match(staged,/Admins can manage all businesses/);
  assert.match(staged,/Vendors manage own verifications/);
  assert.match(staged,/FOR INSERT TO authenticated[\s\S]*status='pending'/);
  assert.match(staged,/FOR SELECT TO authenticated/);
});
test("new privileged functions are not anonymous RPC endpoints",()=>{
  assert.match(staged,/SECURITY DEFINER SET search_path=''/g);
  assert.match(staged,/REVOKE ALL ON FUNCTION public\.slbi_p0_guard_profile_verification\(\)/);
  assert.match(staged,/REVOKE ALL ON FUNCTION public\.slbi_p0_guard_business_review_audit\(\)/);
  assert.match(assertions,/has_function_privilege\('anon',oid,'EXECUTE'\)/);
});
test("legacy leads/analytics policies and counters remain untouched until coordinated cutover",()=>{
  assert.doesNotMatch(staged,/DROP POLICY IF EXISTS "Anyone can insert (leads|logs)"/);
  assert.doesNotMatch(staged,/DROP TABLE|TRUNCATE TABLE|DELETE FROM public\./i);
  assert.doesNotMatch(staged,/OLD\.views|OLD\.calls|OLD\.rating|OLD\.reviews_count/);
  assert.match(runbook,/legacy Expo\/mobile/);
  assert.match(runbook,/server-only key/);
});
test("rollback cannot restore known anonymous-public broad read",()=>{
  assert.doesNotMatch(rollback,/CREATE POLICY "Temporary Public View"/);
  assert.doesNotMatch(rollback,/CREATE POLICY "Vendors manage own verifications"/);
  assert.match(rollback,/DROP TRIGGER IF EXISTS slbi_p0_profile_review_guard/);
  assert.match(runbook,/NO-GO/);
});
