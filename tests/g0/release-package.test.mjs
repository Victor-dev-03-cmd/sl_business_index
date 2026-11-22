import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const base='docs/growth/g0/';
for(const domain of ['LEAD','REVIEW','WALLET']) test(domain+' release body preserves reviewed SQL and has no explicit transaction commit',()=>{
 const original=read(base+({LEAD:'LEAD_REPLAY_REVIEW_ONLY.sql',REVIEW:'REVIEW_CACHE_REVIEW_ONLY.sql',WALLET:'WALLET_ENTITLEMENT_REFUND_REVIEW_ONLY.sql'}[domain]));
 const applied=original.slice(original.indexOf('BEGIN;\n')+7).replace(/\nCOMMIT;\s*$/,'');
 const release=read(base+'release/'+domain+'_FORWARD_BODY.sql');
 assert.ok(release.includes(applied));assert.match(release,/SET LOCAL lock_timeout='5s'/);assert.doesNotMatch(release,/^COMMIT;$/m);
});
test('live schema fingerprints, review backfill and wallet quiescence guard',()=>{
 assert.match(read(base+'release/LEAD_FORWARD_BODY.sql'),/G0 definition drift/);
 assert.match(read(base+'release/WALLET_FORWARD_BODY.sql'),/G0 in-flight AI reservations/);
 assert.match(read(base+'release/REVIEW_FORWARD_BODY.sql'),/G0 review backfill mismatch/);
 assert.doesNotMatch(read(base+'release/REVIEW_RECOVERY_BODY.sql'),/^DROP .* CASCADE/im);
});
