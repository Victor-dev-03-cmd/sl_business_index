/**
 * SLBI SemanticSearch v3: risk-gated fusion contract.
 *
 * This module NEVER fabricates embeddings or treats dictionary/category
 * matches as model inference. It can combine a real model's verified
 * cosine-distance ranks with existing HybridSearch v2 rankings once an
 * external audited embedder + corpus index are ready.
 */
import { reciprocalRankFusion } from "./hybridSearch.ts";

export const SEMANTIC_SEARCH_VERSION = "3.0.0";
export type SemanticRankedCandidate = { id: string | number; similarity: number; modelId: string };
export type SemanticRollout = {
  enabled: boolean;
  modelId: string;
  minimumIndexedCoverage: number;
  minimumNdcgImprovement: number;
  maxEmbeddingLatencyMs: number;
};

/** Fail-closed until same-model vectors and measured relevance exist. */
export const SEMANTIC_ROLLOUT: Readonly<SemanticRollout> = Object.freeze({
  enabled: false,
  modelId: "",
  minimumIndexedCoverage: 0.95,
  minimumNdcgImprovement: 0.02,
  maxEmbeddingLatencyMs: 350,
});

export type SemanticReadiness = {
  indexedApproved: number;
  totalApproved: number;
  modelId: string;
  benchmarkNdcgV2: number | null;
  benchmarkNdcgV3: number | null;
  queryEmbeddingP95Ms: number | null;
  nativeLanguageJudgments: number;
  nativeLanguageQueryCount: number;
  reviewPassed: boolean;
};

export type SemanticGateReport = { ready: boolean; blockers: string[]; coverage: number };
export function evaluateSemanticGate(
  state: SemanticReadiness,
  config: SemanticRollout = SEMANTIC_ROLLOUT,
): SemanticGateReport {
  const blockers: string[] = [];
  const coverage = state.totalApproved > 0
    ? Math.max(0, Math.min(1, state.indexedApproved / state.totalApproved)) : 0;
  if (!config.enabled) blockers.push("feature flag disabled");
  if (!config.modelId || state.modelId !== config.modelId) blockers.push("same-model vector contract not established");
  if (coverage < config.minimumIndexedCoverage) blockers.push("approved listing vector coverage below gate");
  if (!state.reviewPassed || state.nativeLanguageJudgments < 100 ||
      state.nativeLanguageQueryCount < 100) blockers.push("independent Tamil/Sinhala relevance review incomplete");
  if (state.benchmarkNdcgV2 === null || state.benchmarkNdcgV3 === null ||
      !Number.isFinite(state.benchmarkNdcgV2) || !Number.isFinite(state.benchmarkNdcgV3) ||
      state.benchmarkNdcgV3 - state.benchmarkNdcgV2 < config.minimumNdcgImprovement) {
    blockers.push("measurable relevance improvement not proven");
  }
  if (state.queryEmbeddingP95Ms === null ||
      !Number.isFinite(state.queryEmbeddingP95Ms) ||
      state.queryEmbeddingP95Ms > config.maxEmbeddingLatencyMs) {
    blockers.push("embedding latency budget not proven");
  }
  return { ready: blockers.length === 0, blockers, coverage };
}

/** Query-by-query fail-closed fusion with strict similarity and model validation. */
export function fuseVerifiedSemantic<T extends { id?: string | number; match_type?: string | null }>(
  baseline: readonly T[],
  semantic: readonly SemanticRankedCandidate[],
  config: SemanticRollout,
  gate: SemanticGateReport,
  options: { specificService?: boolean } = {},
): T[] {
  if (!config.enabled || !gate.ready || !baseline.length || !semantic.length) return [...baseline];
  const ids = new Set(baseline.map(item => String(item.id ?? "")));
  const seen = new Set<string>();
  const semanticRanked = semantic
    .filter(row => row && row.modelId === config.modelId &&
      Number.isFinite(row.similarity) && row.similarity >= -1 && row.similarity <= 1 &&
      ids.has(String(row.id)))
    .sort((a, b) => b.similarity - a.similarity || String(a.id).localeCompare(String(b.id)))
    .filter(row => {
      const id = String(row.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map(row => String(row.id));
  if (!semanticRanked.length) return [...baseline];
  const baselineIds=baseline.map(row=>String(row.id));
  const ranks=reciprocalRankFusion([
    {ids:baselineIds,weight:1.0},
    {ids:semanticRanked,weight:0.75},
  ]);
  const originalRank=new Map(baselineIds.map((id,index)=>[id,index]));
  return [...baseline].sort((a,b)=> {
    // A semantic similarity score cannot prove an unverified shop sells a
    // named product. Keep real exact-service evidence above related categories.
    if (options.specificService) {
      const tier = (v: T) => v.match_type === "exact_service" ? 3 :
        v.match_type === "category_related" ? 0 : 1;
      const evidence = tier(b) - tier(a);
      if (evidence) return evidence;
    }
    const aid=String(a.id),bid=String(b.id);
    const compare=(ranks.get(bid)||0)-(ranks.get(aid)||0);
    return compare || (originalRank.get(aid)||0)-(originalRank.get(bid)||0);
  });
}
