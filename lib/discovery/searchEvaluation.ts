/** Offline relevance metrics for SLBI Search Evaluation; no user telemetry. */
export type Judgment = { id: string; relevance: 0|1|2|3 };
export function precisionAtK(returnedIds:readonly string[],judgments:readonly Judgment[],k=10){
 const relevant=new Set(judgments.filter(j=>j.relevance>=2).map(j=>j.id));
 const top=returnedIds.slice(0,k);
 return top.length?top.filter(id=>relevant.has(id)).length/Math.min(k,top.length):0;
}
export function ndcgAtK(returnedIds:readonly string[],judgments:readonly Judgment[],k=10){
 const weights=new Map(judgments.map(j=>[j.id,j.relevance]));
 const gain=(v:number,position:number)=>(2**v-1)/Math.log2(position+2);
 const actual=returnedIds.slice(0,k).reduce((sum,id,index)=>sum+gain(weights.get(id)||0,index),0);
 const ideal=judgments.map(j=>j.relevance).sort((a,b)=>b-a).slice(0,k)
   .reduce((sum,v,index)=>sum+gain(v,index),0);
 return ideal?actual/ideal:0;
}
export const SMARTSEARCH_ALGORITHM = Object.freeze({
 id:"slbi-smartsearch",version:"1.0.0",owner:"SLBI Discovery Engine",
 retrieval:"PostgreSQL full-text + pg_trgm + PostGIS",
 ranking:"SLBI GeoRank v1.1.0",semantic:"not enabled",
 evaluation:["Precision@10","nDCG@10","radius-recall tests"],
 privacy:"no location/query history saved by this module",
 rollout:"controlled-preview-first",
});
