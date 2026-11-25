import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const root=new URL('../../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
test('ML05 privacy and selection contract',()=>{
 const c=JSON.parse(read('ml/neurogrowth/contracts/ml05_robustness_contract.json'));
 const code=read('ml/neurogrowth/ml05_stability.py');
 assert.equal(c.research_only,true);assert.equal(c.real_vendor_data,false);
 assert.ok(c.minimum_distinct_data_seeds>=3);
 assert.match(code,/synthetic_panel\(businesses,dataset_seed\)/);
 assert.match(code,/bootstrap_by_business/);
 assert.match(code,/validation_macro_f1/);
 assert.match(code,/production_promotion_permitted/);
 assert.doesNotMatch(code,/SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|NEON_DATABASE_URL|supabase\.createClient/);
});
test('No business records or misleading claims in ML05 receipt schema',()=>{
 const c=JSON.parse(read('ml/neurogrowth/contracts/ml05_robustness_contract.json'));
 assert.ok(c.guardrails.some(x=>x.includes('no raw PII')));
 assert.ok(c.guardrails.some(x=>x.includes('no causal impact')));
});

test('ML05 Deepnote receipt matches validation-only selection and reports failure gates',()=>{
 const r=JSON.parse(read('ml/neurogrowth/experiment_20261125_ml05_synthetic_metrics.json'));
 assert.equal(r.research_only,true);
 assert.equal(r.real_business_validation,false);
 assert.equal(r.production_promotion_permitted,false);
 assert.equal(r.deepnote.status,'success');
 assert.equal(r.deepnote.python_tests,'3/3 PASS');
 assert.equal(r.scenarios.length,3);
 assert.deepEqual(r.method.dataset_seeds,[11,42,73]);
 assert.equal(r.across_selected_neural.accuracy.mean,0.8759);
 assert.ok(r.scenarios.some(s=>s.improve_contact_recall===0));
 assert.ok(r.scenarios.every(s=>s.improve_contact_support<10));
 assert.ok(r.scenarios.some(s=>s.paired_95_delta_neural_minus_rules_macro_f1[0]<0));
});
