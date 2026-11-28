import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {deflateRawSync} from 'node:zlib';
import {stripTypeScriptTypes} from 'node:module';
import {pathToFileURL} from 'node:url';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function zip(entries){
 const local=[],central=[];let offset=0;
 for(const [name,value] of entries){
  const n=Buffer.from(name),raw=Buffer.from(value),data=deflateRawSync(raw),crc=crc32(raw);
  const l=Buffer.alloc(30);l.writeUInt32LE(0x04034b50);l.writeUInt16LE(20,4);l.writeUInt16LE(8,8);l.writeUInt32LE(crc,14);l.writeUInt32LE(data.length,18);l.writeUInt32LE(raw.length,22);l.writeUInt16LE(n.length,26);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(8,10);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);
  local.push(l,n,data);central.push(c,n);offset+=l.length+n.length+data.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,directory,end]).toString('base64');
}
const sheet=cells=>'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row>'+cells+'</row></sheetData></worksheet>';
const workbook=zip([
 ['xl/sharedStrings.xml','<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>ONE@example.invalid</t></si><si><t>one@example.invalid</t></si><si><t>bad@invalid</t></si></sst>'],
 ['xl/worksheets/sheet1.xml',sheet('<c t="s"><v>0</v></c><c t="s"><v>1</v></c><c t="s"><v>2</v></c><c t="str"><f>1</f><v>hidden@example.invalid</v></c>')],
 ['xl/worksheets/sheet2.xml',sheet('<c t="inlineStr"><is><t>two@example.invalid</t></is></c>')]
]);
const invalid=zip([['xl/worksheets/sheet1.xml','<!DOCTYPE worksheet [<!ENTITY x "fake@example.invalid">]><worksheet/>']]);
const code=stripTypeScriptTypes(read('lib/marketing/email-import-contract.ts')).replaceAll('export ','')+'\n'+stripTypeScriptTypes(read('lib/marketing/email-import-xlsx.ts')).replace(/^import[^\n]*\n/,'').replaceAll('export ','');
const html='<!doctype html><body>RUNNING<script>'+code+'
(async()=>{try{const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer;const p=await parseContactXlsx(decode('+JSON.stringify(workbook)+'));let rejected=false;try{await parseContactXlsx(decode('+JSON.stringify(invalid)+'))}catch(e){rejected=e.message==="Unsupported Excel XML."}document.body.textContent=JSON.stringify({emails:p.emails,duplicates:p.duplicates,invalid:p.invalid,rejected});}catch(e){document.body.textContent="FAIL "+e.message;}})();</script>';
const executable=process.env.CHROME_BIN||['google-chrome','chromium','chromium-browser'].find(x=>spawnSync('which',[x]).status===0);
assert.ok(executable,'Chrome/Chromium is required for real Excel browser acceptance');
const dir=mkdtempSync(join(tmpdir(),'slbi-import-browser-'));
try{
 const file=join(dir,'test.html');writeFileSync(file,html);
 const r=spawnSync(executable,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--user-data-dir='+join(dir,'profile'),'--virtual-time-budget=8000','--dump-dom',pathToFileURL(file).href],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
 assert.equal(r.status,0,r.stderr);const body=r.stdout.match(/<body>(.*?)<\/body>/s)?.[1];assert.ok(body, r.stdout);
 assert.deepEqual(JSON.parse(body),{emails:['one@example.invalid','two@example.invalid'],duplicates:1,invalid:1,rejected:true});
 console.log('Actual Chromium XLSX shared/inline, deduplication, formula skip and XML rejection PASS');
}finally{rmSync(dir,{recursive:true,force:true});}
