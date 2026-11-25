import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const root=new URL('../../',import.meta.url);
const contract=JSON.parse(fs.readFileSync(new URL('ml/neurogrowth/contracts/ml02_research_feature_contract.json',root),'utf8'));
const notebook=JSON.parse(fs.readFileSync(new URL('ml/neurogrowth/notebooks/neurogrowth_ml02_deepnote.ipynb',root),'utf8'));
test('synthetic-only feature and export safety',()=>{
 assert.equal(contract.research_only,true); assert.equal(contract.no_raw_pii_export,true);
 assert.equal(contract.features.length,10);assert.equal(new Set(contract.features.map(x=>x.name)).size,10);
 assert.ok(contract.features.every(x=>x.min===0&&x.max===1&&x.missing==='explicit_unknown_not_zero'));
 assert.ok(contract.prohibited_raw_exports.includes('auth_credentials'));
 assert.match(contract.agent_action_policy,/deny_by_default/);
});
test('Deepnote notebook portable and not executed with private data',()=>{
 assert.equal(notebook.nbformat,4);
 assert.ok(notebook.cells.filter(x=>x.cell_type==='code').length>=4);
 assert.ok(notebook.cells.filter(x=>x.cell_type==='code').every(x=>x.execution_count===null&&x.outputs.length===0));
 const code=notebook.cells.map(x=>x.source.join('')).join('\n');
 assert.match(code,/train\.py/);assert.match(code,/research_only/);
 assert.doesNotMatch(code,/SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|NEON_DATABASE_URL|from google\.colab/);
});
