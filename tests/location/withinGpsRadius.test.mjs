import test from 'node:test';
import assert from 'node:assert/strict';
import {haversineMeters,withinGpsRadius} from '../../lib/discovery/withinGpsRadius.ts';
test('zero distance, radius and distant businesses are bounded',()=>{
 assert.equal(withinGpsRadius(8.756,80.496,5000,8.756,80.496),true);
 assert.equal(withinGpsRadius(8.756,80.496,5000,6.9271,79.8612),false);
 assert.equal(withinGpsRadius(8.756,80.496,5000,8.81,80.496),false);
 assert.equal(withinGpsRadius(8.756,80.496,5000,8.766,80.496),true);
});
test('a missing or zeroed map pin never appears as a nearby business',()=>{
 for(const item of [[null,null],[undefined,80],[0,0],['foo',80],[90.1,80],[8.75,null]]){
   assert.equal(withinGpsRadius(8.756,80.496,5000,item[0],item[1]),false);
 }
});
test('user chooses 1 km not implicit 50 km expansion',()=>{
 assert.equal(withinGpsRadius(8.756,80.496,1000,8.766,80.496),false);
 assert.ok(haversineMeters(8.756,80.496,8.766,80.496)>1000);
});
