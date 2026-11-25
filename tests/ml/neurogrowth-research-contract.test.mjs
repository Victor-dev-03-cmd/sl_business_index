import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const model=read('ml/neurogrowth/train.py');
const infer=read('ml/neurogrowth/predict.py');
const metrics=JSON.parse(read('ml/neurogrowth/experiment_20261125_synthetic_metrics.json'));
const notebook=JSON.parse(read('ml/neurogrowth/notebooks/neurogrowth_ml01_colab.ipynb'));
const agent=read('lib/growth/agent/capabilities.ts');
test('ML-01 is clearly synthetic-only with train/val/test and non-leaking features',()=>{
  assert.match(model,/NeuroGrowth ML-01: synthetic-only research training/);
  assert.match(model,/x, y = make_synthetic\(seed, size\)/);
  assert.match(model,/torch\.optim\.AdamW/);
  assert.match(model,/CrossEntropyLoss/);
  assert.match(model,/ids\[:train_end\], ids\[train_end:val_end\], ids\[val_end:\]/);
  assert.match(model,/best_state/);
  assert.match(model,/test_macro_f1/);
  assert.match(model,/action_distribution_train/);
  assert.doesNotMatch(model,/supabase|neon|service_role|private_key|phone_number|customer_email/i);
  assert.equal(metrics.research_only,true);
  assert.equal(metrics.real_business_validation,false);
  assert.equal(metrics.real_business_accuracy_claim,null);
  assert.equal(metrics.train+metrics.validation+metrics.test,metrics.businesses_synthetic);
  assert.equal(metrics.test_accuracy_synthetic,.8);
  assert.equal(metrics.test_macro_f1_synthetic,.6564);
  assert.ok(metrics.sha256_checkpoint.length===64);
});
test('Offline inference refuses bad schema, low coverage or unnormalized input and only ranks actions',()=>{
  assert.match(infer,/features\[-1\] < \.75/);
  assert.match(infer,/math\.isfinite\(v\)/);
  assert.match(infer,/obj\.get\("research_only"\) is not True/);
  assert.match(infer,/model\.load_state_dict/);
  assert.match(infer,/model\.eval\(\)/);
  assert.match(infer,/no_vendor_outcome_probability/);
  assert.doesNotMatch(infer,/supabase|neon|service_role|https?:\/\/|fetch\(|\.update\(/i);
});
test('Colab cells are runnable newline-separated source without embedded credentials',()=>{
  assert.equal(notebook.nbformat,4);
  assert.ok(notebook.cells.length>=3);
  for(const cell of notebook.cells){
    assert.ok(cell.source.every(line=>!line.includes('\\n')));
  }
  const combined=notebook.cells.map(cell=>cell.source.join('')).join('\n');
  assert.match(combined,/ml\/neurogrowth\/train\.py/);
  assert.match(combined,/model_artifacts\/neurogrowth-research-v0\.1\.json/);
  assert.doesNotMatch(combined,/SUPABASE_SERVICE_ROLE|NEON_DATABASE_URL|ghp_|sk-proj-|auth\.token/i);
});
test('Agent is non-executing by design and refuses billing, account deletion and verification approval',()=>{
  assert.match(agent,/SERVER-INTEGRATION-DESIGN-ONLY/);
  assert.match(agent,/kind:'approval_required'/);
  assert.match(agent,/kind:'draft_only'/);
  assert.match(agent,/kind:'read_candidate'/);
  assert.match(agent,/request_billing_change:\{kind:'blocked'/);
  assert.match(agent,/request_account_delete:\{kind:'blocked'/);
  assert.match(agent,/request_verification_approval:\{kind:'blocked'/);
  assert.match(agent,/serverOwnedBusinessIds\.includes\(proposal\.businessId\)/);
  assert.doesNotMatch(agent,/\.from\(|await fetch\(|\.update\(|\.insert\(|\.delete\(/);
});
test('Research packaging excludes private training datasets and exported weights from Git',()=>{
  const ignore=read('ml/neurogrowth/.gitignore');
  assert.match(ignore,/datasets\//);
  assert.match(ignore,/model_artifacts\//);
  assert.match(ignore,/\.env\*/);
});
