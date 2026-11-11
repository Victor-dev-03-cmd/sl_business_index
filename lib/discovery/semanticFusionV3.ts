/**
 * SLBI SemanticSearch v3 — secure, model-agnostic fusion adapter.
 * Only accepts vectors from the same verified model/version and already
 * approved/visible candidate IDs. No untrusted semantic candidate can bypass
 * the PostGIS, availability, or exact-service controls.
 *
 * Production is OFF until multilingual embeddings + relevance review pass.
 */
import { rankHybridSearch } from "./hybridSearch.ts";
import type { GeoRankBusiness } from "./geoRank.ts";

export const SEMANTIC_SEARCH_V3_VERSION = "3.0.0-research";
export const SEMANTIC_V3_ENABLED_BY_DEFAULT = false;
export const SEMANTIC_RRF_K = 60;

export type SemanticHit = {
  businessId: string;
  modelId: string;
  similarity: number;
};
type Candidate = GeoRankBusiness & {
  id?: string | number;
  name?: string | null;
  category?: string | null;
  description?: string | null;
  match_type?: string | null;
};

const idFor = (item: Candidate): string => String(item.id ?? "");
const safeModel = (modelId: string): boolean =>
  modelId.length>2 && modelId.length<120 && /^[\w./-]+$/.test(modelId);

export function fuseSemanticV3<T extends Candidate>(
  candidates: readonly T[],
  query: string,
  radiusMeters: number,
  semanticHits: readonly SemanticHit[],
  options: {
    modelId: string;
    specificService?: boolean;
    enabled?: boolean;
    semanticWeight?: number;
  },
): T[] {
  const baseline=rankHybridSearch(candidates,query,radiusMeters,{
    specificService:Boolean(options.specificService),
  });
  // Fail closed on missing model validation, no-hits, no-search and mismatch.
  if(!options.enabled || !safeModel(options.modelId) ||
     !query.trim() || !semanticHits.length || candidates.length<2)return baseline;

  const ids=new Set(baseline.map(idFor));
  const safeHits=semanticHits.filter(hit=>
    hit.modelId===options.modelId &&
    ids.has(String(hit.businessId)) &&
    Number.isFinite(hit.similarity) &&
    hit.similarity>=-1 && hit.similarity<=1,
  );
  if(!safeHits.length)return baseline;
  const semanticScores=new Map<string,number>();
  for(const hit of safeHits) {
    const id=String(hit.businessId);
    semanticScores.set(id,Math.max(hit.similarity,semanticScores.get(id)??-1));
  }
  const semanticSorted=[...semanticScores.entries()]
    .filter(([,score])=>score>=0.35)
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
    .map(([id])=>id);
  if(!semanticSorted.length)return baseline;

  const semanticRanks=new Map(semanticSorted.map((id,index)=>[id,index]));
  const baseRanks=new Map(baseline.map((item,index)=>[idFor(item),index]));
  const weight=Math.min(1.25,Math.max(0,Number(options.semanticWeight ?? 0.6)));
  if(!Number.isFinite(weight) || weight===0)return baseline;
  const tier=(item:T)=>{
    if(!options.specificService)return 1;
    if(item.match_type==="exact_service")return 3;
    if(item.match_type==="category_related")return 0;
    return 1;
  };
  return [...baseline].sort((a,b)=>{
    // Verified product evidence always wins. Similarity cannot assert that a
    // car wash is an engine repair facility or a café serves biryani.
    if(tier(a)!==tier(b))return tier(b)-tier(a);
    const score=(item:T)=>{
      const id=idFor(item);
      const lexical=1/(SEMANTIC_RRF_K+1+(baseRanks.get(id)??99999));
      const rank=semanticRanks.get(id);
      const semantic=rank===undefined?0:weight/(SEMANTIC_RRF_K+rank+1);
      return lexical+semantic;
    };
    return score(b)-score(a) ||
      (baseRanks.get(idFor(a))??99999)-(baseRanks.get(idFor(b))??99999);
  });
}
