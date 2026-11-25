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

test('Deepnote receipt is synthetic only and selects by validation, never test',()=>{
 const r=JSON.parse(read('ml/neurogrowth/experiment_20261125_ml04_synthetic_metrics.json'));
 assert.equal(r.deepnote_run_status,'success');
 assert.equal(r.real_business_validation,false);
 assert.equal(r.dataset.test_businesses,90);
 assert.equal(r.dataset.test_rows,180);
 assert.equal(r.neural_runs.length,4);
 const selected=r.neural_runs.reduce((a,b)=>b.validation_macro_f1>a.validation_macro_f1?b:a);
 assert.equal(selected.architecture,r.validation_selected.architecture);
 assert.equal(selected.seed,r.validation_selected.seed);
 assert.equal(selected.test_accuracy,r.validation_selected.accuracy);
 assert.equal(r.validation_selected.per_action_recall.improve_contact,0.6);
 assert.notEqual(Math.max(...r.neural_runs.map(x=>x.test_accuracy)),r.validation_selected.accuracy);
});
