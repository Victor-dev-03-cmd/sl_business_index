import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ledger = JSON.parse(readFileSync('docs/growth/g0/exit/G0_FOUNDATION_EXIT_LEDGER_20261123.json','utf8'));
const sql=readFileSync('docs/growth/g0/release/FOUNDATION_SECURITY_READ_ONLY.sql','utf8');

test('G0 foundation has seven separately evidenced exit gates, not ten product gates',()=>{
 assert.equal(ledger.schema_version,'slbi-g0-foundation-exit-v1');
 const expected=Array.from({length:7},(_,i)=>'G0-0'+(i+1));
 assert.deepEqual(ledger.g0_gates.map(g=>g.id),expected);
 assert.equal(ledger.master_product_release.total,10);
 assert.match(ledger.master_product_release.meaning,/Whole GrowthOS/);
});
test('no gate can be declared accepted from synthetic CI or a frozen preflight alone',()=>{
 const accepted=ledger.g0_gates.filter(g=>g.status==='ACCEPTED');
 assert.equal(ledger.phase_exit.accepted,accepted.length);
 assert.equal(ledger.phase_exit.total,ledger.g0_gates.length);
 assert.equal(ledger.phase_exit.status,accepted.length===7?'ACCEPTED':'BLOCKED');
 assert.ok(ledger.g0_gates.every(g=>Array.isArray(g.evidence)&&g.evidence.length&&Array.isArray(g.blockers)));
 for(const g of ledger.g0_gates) if(g.status==='ACCEPTED'){
   assert.equal(g.blockers.length,0,'No accepted gate may retain blockers: '+g.id);
   assert.ok(g.owner_reviewed_at_utc && g.owner_decision_ref,'No unsigned gate accepted: '+g.id);
 }
 assert.equal(ledger.production_read_only_preflight.status,'PASS');
 assert.ok(ledger.production_read_only_preflight.review_cache_mismatches>=0);
});
test('existing direct-access findings and device errors must remain visible as blockers',()=>{
 const s=ledger.security_advisor_triage;
 assert.equal(s.status,'REVIEW_REQUIRED');
 assert.equal(s.sensitive_table_unsafe_read_acl_count,0);
 assert.ok(s.application_anon_definer_count>=0);
 assert.ok(s.application_definer_mutable_search_path_count>=0);
 assert.equal(ledger.g0_gates.find(g=>g.id==='G0-06').status,'OPEN');
 assert.match(ledger.g0_gates.find(g=>g.id==='G0-06').blockers.join(' '),/desktop browser GPS/);
});
test('security inspection SQL is catalog-only and cannot change data or reveal customer rows',()=>{
 assert.match(sql,/^-- SLBI G0:/);
 assert.match(sql,/SELECT 'app_anon_security_definers'/);
 assert.match(sql,/pg_proc/);
 assert.match(sql,/has_table_privilege/);
 assert.doesNotMatch(sql,/\b(?:INSERT\s+INTO|UPDATE\s+public|DELETE\s+FROM|DROP\s+(?:TABLE|FUNCTION|EXTENSION)|ALTER\s+(?:TABLE|FUNCTION)|CREATE\s+(?:TABLE|FUNCTION)|TRUNCATE|COPY\s+)\b/i);
 assert.doesNotMatch(sql,/pg_get_functiondef|auth\.users|customer_email|raw_user_meta_data/i);
});
