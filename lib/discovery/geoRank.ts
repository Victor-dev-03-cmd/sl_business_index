/** SLBI GeoRank v1.0.0: pure, explainable ranking of approved PostGIS candidates. */
export const GEO_RANK_VERSION = "1.0.0";
export type GeoRankBusiness = {
  id?: string; name?: string|null; category?: string|null; description?: string|null;
  distance_meters?: number|null; search_rank?: number|null; rating?: number|null;
  image_url?: string|null; logo_url?: string|null; phone?: string|null;
  website_url?: string|null; is_verified?: boolean|null; can_show_badge?: boolean|null;
  verification_status?: string|null; updated_at?: string|null;
  availability_verified?: boolean|null;
};
export type GeoRankScores = {
  relevance: number; distance: number; quality: number; freshness: number|null;
  availability: number|null; score: number; version: typeof GEO_RANK_VERSION;
};
export const DEFAULT_GEO_RANK_WEIGHTS = Object.freeze({
  relevance: 0.42, distance: 0.32, quality: 0.18, freshness: 0.05, availability: 0.03,
});
type WeightKey = keyof typeof DEFAULT_GEO_RANK_WEIGHTS;
const clamp = (n:number, min=0, max=1) => Math.min(max,Math.max(min,Number.isFinite(n)?n:min));
const plain = (s?:string|null) => (s||"").toLocaleLowerCase().trim().replace(/\s+/g," ");
const SEARCH_ALIASES: ReadonlyArray<{words:readonly string[];canonical:string}> = [
 {words:["உணவகம்","உணவு","சாப்பாடு","ආහාර","අවන්හල"], canonical:"food"},
 {words:["மருத்துவம்","மருத்துவமனை","வைத்தியசாலை","රෝහල","වෛද්‍ය"], canonical:"medical"},
 {words:["கடை","கடைகள்","වෙළඳසැල","සාප්පු"], canonical:"shopping"},
 {words:["பள்ளி","பாடசாலை","පාසල","අධ්‍යාපන"], canonical:"education"},
 {words:["ஹோட்டல்","හෝටල්"], canonical:"hotel"},
];
export function normalizeDiscoveryQuery(query:string):string {
 const normalized=plain(query).slice(0,100);
 const alias=SEARCH_ALIASES.find(({words})=>words.includes(normalized));
 return alias?alias.canonical:normalized;
}
function relevanceScore(item:GeoRankBusiness,query:string):number {
 if(!query)return 0.5;
 const name=plain(item.name), category=plain(item.category), description=plain(item.description);
 const terms=query.split(/\s+/).filter(Boolean);
 const matched=terms.filter(term=>name.includes(term)||category.includes(term)||description.includes(term)).length;
 const lexical=terms.length?matched/terms.length:0;
 const fuzzy=clamp(Number(item.search_rank??0)/0.65);
 return clamp(Math.max(
 name===query?1:0,name.startsWith(query)?0.93:0,category===query?0.88:0,
 category.startsWith(query)?0.83:0,name.includes(query)?0.79:0,
 category.includes(query)?0.72:0,description.includes(query)?0.50:0,
 lexical*0.69,fuzzy*0.62,
 ));
}
function qualityScore(item:GeoRankBusiness):number {
 let score=0.30;
 if(plain(item.description).length>=35)score+=0.16;
 if(item.image_url||item.logo_url)score+=0.15;
 if(item.phone)score+=0.11;
 if(item.website_url)score+=0.09;
 if(item.can_show_badge&&(item.is_verified||item.verification_status==="verified"))score+=0.19;
 return clamp(score);
}
export function scoreGeoRank(
 item:GeoRankBusiness,query="",radiusMeters=10000,
 weights=DEFAULT_GEO_RANK_WEIGHTS,
):GeoRankScores {
 const relevance=relevanceScore(item,normalizeDiscoveryQuery(query));
 const distance=item.distance_meters==null?0:
  clamp(1/(1+Math.max(0,item.distance_meters)/Math.max(1000,radiusMeters*0.55)));
 const quality=qualityScore(item);
 let freshness:number|null=null;
 if(item.updated_at) {
   const time=Date.parse(item.updated_at);
   if(Number.isFinite(time)){
     const days=Math.max(0,(Date.now()-time)/86_400_000);
     freshness=clamp(Math.exp(-days/365));
   }
 }
 const availability=typeof item.availability_verified==="boolean"?Number(item.availability_verified):null;
 const signals:Partial<Record<WeightKey,number>>={relevance,distance,quality};
 if(freshness!=null)signals.freshness=freshness;
 if(availability!=null)signals.availability=availability;
 let sum=0,totalWeight=0;
 for(const key of Object.keys(weights) as WeightKey[]){
   const signal=signals[key];
   if(signal==null)continue;
   sum+=signal*weights[key];
   totalWeight+=weights[key];
 }
 return {relevance,distance,quality,freshness,availability,
   score:totalWeight?clamp(sum/totalWeight):0,version:GEO_RANK_VERSION};
}
export function sortGeoRank<T extends GeoRankBusiness>(items:readonly T[],query:string,radiusMeters:number):T[]{
 return items.map(item=>({
  item,score:scoreGeoRank(item,query,radiusMeters).score,
  distance:item.distance_meters??Number.POSITIVE_INFINITY,
  id:String(item.id||item.name||""),
 })).sort((a,b)=>b.score-a.score||a.distance-b.distance||a.id.localeCompare(b.id))
 .map(entry=>entry.item);
}
