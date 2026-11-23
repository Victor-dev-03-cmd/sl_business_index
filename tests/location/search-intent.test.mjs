import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSmartSearch} from '../../lib/discovery/smartSearch.ts';
import {SL_TOWNS} from '../../lib/towns.ts';

test('unqualified Hotels is a GPS-eligible search, not a guessed city',()=>{
 const intent=resolveSmartSearch('Hotels',SL_TOWNS);
 assert.equal(intent.location,null);
 assert.match(intent.canonicalQuery,/hotel/i);
});
for(const [query,city] of [
 ['Hotels in Colombo','colombo'],
 ['Restaurants in Jaffna','jaffna'],
 ['Hotel near Kandy','kandy'],
]){
 test('explicit locality '+query+' must not request device GPS',()=>{
  const intent=resolveSmartSearch(query,SL_TOWNS);
  assert.ok(intent.location,'Known city should be parsed');
  assert.equal(intent.location.name.toLowerCase(),city);
  assert.ok(!intent.canonicalQuery.toLowerCase().includes(city),'City token must be removed from service query');
  assert.match(intent.canonicalQuery,/hotel|restaurant/i);
 });
}
