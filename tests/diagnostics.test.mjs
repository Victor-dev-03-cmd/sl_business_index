import test from "node:test";
import assert from "node:assert/strict";
import {recordNearbySample,nearbyPerformanceSummary,resetNearbySamples,NEARBY_SAMPLE_LIMIT} from "../lib/discovery/diagnostics.ts";
test("invalid timings not recorded",()=>{resetNearbySamples();recordNearbySample(-1,4,false);recordNearbySample(NaN,4,false);recordNearbySample(42,3,false);assert.equal(nearbyPerformanceSummary().count,1);assert.equal(nearbyPerformanceSummary().p95Ms,42)});
test("rolling size and p95",()=>{resetNearbySamples();for(let i=0;i<150;i++)recordNearbySample(i,0,false);assert.equal(nearbyPerformanceSummary().count,NEARBY_SAMPLE_LIMIT);assert.equal(nearbyPerformanceSummary().p95Ms,144)});
test("error count without identifying data",()=>{resetNearbySamples();recordNearbySample(20,0,true);assert.deepEqual(nearbyPerformanceSummary(),{count:1,p95Ms:20,errors:1,averageResults:0})});
