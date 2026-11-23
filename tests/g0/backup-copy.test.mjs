import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,chmodSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const run=(...args)=>spawnSync('bash',['scripts/g0/verify-independent-backup-copy.sh',...args],{encoding:'utf8'});
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'slbi-g0-copy-'));chmodSync(root,0o700);
 const src=join(root,'slbi-20261122T191129Z-Synthetic'),copy=join(root,'copy');
 mkdirSync(src,{mode:0o700});mkdirSync(copy,{mode:0o700});
 const bytes=Buffer.from('SYNTHETIC PLACEHOLDER, NOT AN ARCHIVE');
 const hash=createHash('sha256').update(bytes).digest('hex');
 const files={
  'database.dump.gpg':bytes,
  'SHA256SUMS':hash+'  database.dump.gpg\n',
  'evidence.txt':'project_ref=oofxhragafekazwjikae\nencrypted_sha256='+hash+'\nencrypted_bytes='+bytes.length+'\n'
 };
 for(const dir of [src,copy])for(const [name,content] of Object.entries(files)){
  writeFileSync(join(dir,name),content,{mode:0o600});chmodSync(join(dir,name),0o600);
 }
 return {src,copy,root};
}
for(const [title,change,pass] of [
 ['matching encrypted copy',()=>{},true],
 ['copied archive corrupt',x=>writeFileSync(join(x.copy,'database.dump.gpg'),'tampered'),false],
 ['wrong evidence',x=>writeFileSync(join(x.src,'evidence.txt'),'project_ref=wrong\n'),false],
 ['copy is world-readable',x=>chmodSync(x.copy,0o755),false],
 ['symlink archive',x=>{rmSync(join(x.copy,'database.dump.gpg'));symlinkSync(join(x.src,'database.dump.gpg'),join(x.copy,'database.dump.gpg'));},false]
]){
 test(title,()=>{const x=fixture();try{change(x);const p=run('--verify',x.src,x.copy);if(pass){assert.equal(p.status,0,p.stderr);assert.match(p.stdout,/COPY_BYTES_VERIFIED/);}else{assert.notEqual(p.status,0);}}finally{rmSync(x.root,{recursive:true,force:true});}});
}
test('unmounted copy destination fails closed',()=>{const x=fixture();try{assert.notEqual(run('--copy',x.src,x.copy).status,0);}finally{rmSync(x.root,{recursive:true,force:true});}});
