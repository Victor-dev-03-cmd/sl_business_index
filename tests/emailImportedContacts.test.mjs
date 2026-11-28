import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeImportEmail,previewImport,parseContactText} from '../lib/marketing/email-import-contract.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CSV, TSV, TXT and pasted addresses: normalize, deduplicate, reject invalid cells',()=>{
 const p=parseContactText('Name,Email\r\n"Example, Person","ONE@example.invalid"\r\nOther,one@example.invalid\r\nThird,two@example.invalid\r\nBad,not@valid\n');
 assert.deepEqual(p.emails,['one@example.invalid','two@example.invalid']);
 assert.equal(p.duplicates,1);assert.equal(p.invalid,1);
 assert.deepEqual(parseContactText('a@example.invalid; b@example.invalid\n c@example.invalid d@example.invalid').emails,['a@example.invalid','b@example.invalid','c@example.invalid','d@example.invalid']);
 assert.throws(()=>parseContactText('"unfinished'),/quotation/);
 for(const bad of ['a..b@example.invalid','a@-example.invalid','a@localhost','a@example-.invalid','a@example.invalid\nBcc: x@example.invalid','Name <a@example.invalid>'])assert.equal(normalizeImportEmail(bad),null);
 assert.throws(()=>previewImport(Array.from({length:5001},(_,i)=>'u'+i+'@example.invalid')),/5,000/);
});
test('import file is local, bounded, explicit, server revalidated and scoped',()=>{
 const ui=read('app/vendor/marketing/engine/components/ImportedContacts.tsx'),xlsx=read('lib/marketing/email-import-xlsx.ts'),api=read('app/api/marketing/email/imports/route.ts');
 assert.match(ui,/accept=".xlsx,.csv,.txt"/);
 assert.match(ui,/parseContactXlsx\(await file.arrayBuffer\(\)\)/);
 assert.match(ui,/No purchased or scraped lists/);
 assert.match(ui,/attested/);assert.match(api,/v.attested!==true/);
 assert.match(api,/auth.getUser\(\)/);assert.match(api,/isSameOrigin/);assert.match(api,/normalizeImportEmail/);
 assert.match(api,/p_owner:auth.owner/);assert.match(api,/EMAIL_IMPORT_MAX_BYTES/);
 assert.match(xlsx,/DecompressionStream\('deflate-raw'\)/);assert.match(xlsx,/length>e.size/);assert.match(xlsx,/DOCTYPE\|<!ENTITY/);assert.match(xlsx,/nodes\(c,'f'\).length/);
 const hub=read('app/vendor/marketing/engine/components/EmailMarketingHub.tsx'),picker=read('app/vendor/marketing/engine/components/AudiencePlanPicker.tsx'),save=read('app/api/marketing/email/campaigns/route.ts');
 assert.match(hub,/<ImportedContacts/);assert.match(picker,/value="imported"/);assert.match(picker,/listId/);assert.match(save,/slbi_email_import_lists/);
});
