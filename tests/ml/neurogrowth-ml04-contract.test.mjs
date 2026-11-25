import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('ML-04 insists on shared synthetic panel, no real-data claims',()=>{
 const s=read('ml/neurogrowth/ml04_neural_benchmark.py');
 const d=JSON.parse(read('ml/neurogrowth/contracts/ml04_model_selection.json'));
 assert.equal(d.research_only,true);
 assert.equal(d.real_business_claim,false);
 assert.match(s,/synthetic_panel\(businesses, seed\)/);
 assert.match(s,/split\(ids, months, seed\)/);
 assert.match(s,/choose_temperature\(val_logits, y\[va\]\)/);
 assert.match(s,/test_logits = logits_for\(net, x\[te\]\)/);
 assert.match(s,/small_mlp/);assert.match(s,/residual_mlp/);
 assert.doesNotMatch(s,/SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|NEON_DATABASE_URL|supabase\.createClient/);
});
