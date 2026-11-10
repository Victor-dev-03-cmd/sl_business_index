import test from "node:test";
import assert from "node:assert/strict";
import {precisionAtK,ndcgAtK,SMARTSEARCH_ALGORITHM} from "../lib/discovery/searchEvaluation.ts";
test("registry versioned and transparent about no semantic engine",()=>{
 assert.equal(SMARTSEARCH_ALGORITHM.version,"1.0.0");
 assert.equal(SMARTSEARCH_ALGORITHM.semantic,"not enabled");
});
test("precision@10 and nDCG@10 perfect for ideal ranking",()=>{
 const j=[{id:"a",relevance:3},{id:"b",relevance:2},{id:"c",relevance:0}];
 assert.equal(precisionAtK(["a","b","c"],j,3),2/3);
 assert.equal(ndcgAtK(["a","b","c"],j,3),1);
});
test("nDCG penalizes misplaced results and stays bounded",()=>{
 const j=[{id:"a",relevance:3},{id:"b",relevance:2},{id:"c",relevance:0}];
 const score=ndcgAtK(["c","a","b"],j,3);
 assert.ok(score>0&&score<1);
});
