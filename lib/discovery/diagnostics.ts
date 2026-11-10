/** Memory-only aggregate latency samples; no GPS, search text, user or business identifiers. */
export type NearbySample={durationMs:number;resultCount:number;errored:boolean};
const samples:NearbySample[]=[];
export const NEARBY_SAMPLE_LIMIT=100;
export function recordNearbySample(durationMs:number,resultCount:number,errored:boolean){
 if(!Number.isFinite(durationMs)||durationMs<0)return;
 samples.push({durationMs:Math.round(durationMs),resultCount:Math.max(0,Math.floor(resultCount)),errored});
 if(samples.length>NEARBY_SAMPLE_LIMIT)samples.shift();
}
export function nearbyPerformanceSummary(){
 const ordered=[...samples].sort((a,b)=>a.durationMs-b.durationMs);
 const count=ordered.length;
 return {count,p95Ms:count?ordered[Math.max(0,Math.ceil(count*0.95)-1)].durationMs:null,
   errors:ordered.filter(s=>s.errored).length,
   averageResults:count?Math.round(ordered.reduce((sum,s)=>sum+s.resultCount,0)/count):null};
}
export function resetNearbySamples(){samples.length=0;}
