export type NetworkHint={saveData?:boolean;effectiveType?:string;downlink?:number};
export function eligiblePublicRoute(href:string):boolean {
 return /^\/(?:category|business-news|about|faq|how-to-list)\/?$/.test(href)||/^\/business\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/.test(href);
}
export function canPrefetch(network?:NetworkHint,online=true,visible=true):boolean {
 return online&&visible&&!network?.saveData&&!['slow-2g','2g','3g'].includes(network?.effectiveType||'')&&!(typeof network?.downlink==='number'&&network.downlink<1.5);
}
export function createPrefetchBudget(max=4,windowMs=30000,ttl=60000){
 const seen=new Map<string,number>();let starts:number[]=[];
 return (href:string,now:number)=>{
  for(const [key,time] of seen)if(now-time>=ttl)seen.delete(key);
  starts=starts.filter(time=>now-time<windowMs);
  if(!eligiblePublicRoute(href)||seen.has(href)||starts.length>=max)return false;
  seen.set(href,now);starts.push(now);return true;
 };
}
