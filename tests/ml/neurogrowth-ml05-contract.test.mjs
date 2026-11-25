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
