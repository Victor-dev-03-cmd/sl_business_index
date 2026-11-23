import test from 'node:test';
import assert from 'node:assert/strict';
import {requestPreciseLocation,validatedFix,locationError,MAX_NEARBY_GPS_ACCURACY_METERS} from '../../lib/location/precise-geolocation.ts';

const position=(lat=9.07,lng=80.52,accuracy=24,timestamp=Date.now())=>({
  coords:{latitude:lat,longitude:lng,accuracy},timestamp
});
const mock=(success,error,watch)=>{
  const calls=[];const cleared=[];
  const api={
    getCurrentPosition:(a,b,o)=>{calls.push(o);queueMicrotask(()=>error?b(error):a(success));},
    watchPosition:(a,b,o)=>{calls.push(o);if(watch)queueMicrotask(()=>a(watch));return 17;},
    clearWatch:(id)=>{cleared.push(id);}
  };
  return {api,calls,cleared};
};
test('fresh precise fix accepted; no cached/IP location; high accuracy requested',async()=>{
 const m=mock(position(),null);
 const fix=await requestPreciseLocation({geolocation:m.api});
 assert.equal(fix.lat,9.07);assert.equal(fix.lng,80.52);
 assert.equal(fix.accuracyMeters,24);
 assert.equal(m.calls[0].enableHighAccuracy,true);
 assert.equal(m.calls[0].maximumAge,0);
});
test('a Colombo-sized approximate IP fix never becomes user GPS origin',async()=>{
 const m=mock(position(6.9271,79.8612,50_000),null,position(9.07,80.52,35));
 const fix=await requestPreciseLocation({geolocation:m.api});
 assert.equal(fix.lat,9.07);assert.equal(m.cleared[0],17);
});
test('coarse fix fails closed when no GPS refinement is available',async()=>{
 const m=mock(position(6.9271,79.8612,45_000),null);
 delete m.api.watchPosition;
 await assert.rejects(requestPreciseLocation({geolocation:m.api}),{code:'inaccurate'});
});
test('permission denied has an actionable independent error',async()=>{
 const m=mock(null,{code:1});
 await assert.rejects(requestPreciseLocation({geolocation:m.api}),{code:'permission-denied'});
});
test('receiver outage and timeout are distinct from permission denial',async()=>{
 for(const [code,expected] of [[2,'unavailable'],[3,'timeout']]){
  const m=mock(null,{code});
  await assert.rejects(requestPreciseLocation({geolocation:m.api}),{code:expected});
 }
});
test('HTTP/no browser GPS returns specific errors without fake fallback',async()=>{
 await assert.rejects(requestPreciseLocation({secureContext:false,geolocation:mock(position()).api}),{code:'insecure'});
 await assert.rejects(requestPreciseLocation({geolocation:{}}),{code:'unsupported'});
});
test('rejected invalid/old/out-of-bounds coordinates and inaccurate fixes',()=>{
 assert.equal(validatedFix(position(200,80,22)),null);
 assert.equal(validatedFix(position(0,0,22)),null);
 assert.equal(validatedFix(position(9,80,22,Date.now()-240000)),null);
 assert.equal(validatedFix(position(9,80,Number.NaN)),null);
 assert.ok(MAX_NEARBY_GPS_ACCURACY_METERS<=2000);
});
test('abort stops pending native request and suppresses late success',async()=>{
 const ctrl=new AbortController();
 let callback;
 const geo={getCurrentPosition:(a)=>{callback=a;}};
 const request=requestPreciseLocation({geolocation:geo,signal:ctrl.signal,initialTimeoutMs:100});
 ctrl.abort();
 await assert.rejects(request,{code:'cancelled'});
 callback(position());
 assert.equal(locationError(new Error()).code,'unavailable');
});
