/**
 * SLBI HybridSearch v2.0.0
 *
 * BM25 lexical ranking (Robertson/Sparck-Jones IDF with length normalization)
 * + contextual GeoRank + evidence-first Reciprocal Rank Fusion.
 *
 * The engine ranks ONLY approved, PostGIS-filtered candidates returned by the
 * existing SQL v2 RPC. It does NOT claim vector semantics or BM25 over the
 * entire national corpus. Model-backed embeddings remain a future adapter
 * pending multilingual model validation and indexed vectors.
 */
import { sortGeoRank, type GeoRankBusiness } from "./geoRank.ts";

export const HYBRID_SEARCH_VERSION = "2.0.0";
export const HYBRID_RRF_K = 60;
export const HYBRID_BM25_K1 = 1.2;
export const HYBRID_BM25_B = 0.75;

type HybridBusiness = GeoRankBusiness & {
  id?: string | number;
  name?: string | null;
  category?: string | null;
  description?: string | null;
};

const STOPWORDS = new Set([
  "the","a","an","of","for","with","and","or","to","near","in","at","shop","shops",
  "store","stores","business","businesses","me","my","find","best","services",
]);

export function searchTokens(value: string): string[] {
  const normalized = String(value || "").normalize("NFKC").toLocaleLowerCase();
  return (normalized.match(/[\p{L}\p{M}\p{N}]+/gu) || [])
    .filter(token => token.length > 1 && !STOPWORDS.has(token))
    .slice(0, 180);
}

function weightedDocument(item: HybridBusiness): string[] {
  // Transparent field boosts: repeated terms increase TF in genuine BM25.
  const name = searchTokens(item.name || "");
  const category = searchTokens(item.category || "");
  const description = searchTokens(item.description || "");
  return [...name, ...name, ...name, ...category, ...category, ...description];
}

/** True corpus-relative BM25; candidates have already passed SQL visibility/RLS. */
export function bm25CandidateScores<T extends HybridBusiness>(
  items: readonly T[],
  query: string,
  options: { k1?: number; b?: number } = {},
): Map<string, number> {
  const result = new Map<string, number>();
  const qTerms = [...new Set(searchTokens(query))].slice(0, 24);
  if (!items.length || !qTerms.length) return result;
  const k1 = options.k1 ?? HYBRID_BM25_K1;
  const b = options.b ?? HYBRID_BM25_B;
  const documents = items.map(item => weightedDocument(item));
  const averageLength = Math.max(1, documents.reduce((sum, doc) => sum + doc.length, 0) / documents.length);
  const counts = documents.map(doc => {
    const terms = new Map<string, number>();
    doc.forEach(token => terms.set(token, (terms.get(token) || 0) + 1));
    return terms;
  });
  const n = documents.length;
  const df = new Map(qTerms.map(term => [term, counts.filter(doc => doc.has(term)).length]));
  items.forEach((item, index) => {
    let score = 0;
    const length = documents[index].length;
    for (const term of qTerms) {
      const tf = counts[index].get(term) || 0;
      if (!tf) continue;
      const idf = Math.log(1 + (n - (df.get(term) || 0) + 0.5) / ((df.get(term) || 0) + 0.5));
      score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * length / averageLength));
    }
    result.set(String(item.id ?? item.name ?? index), score);
  });
  return result;
}

export function reciprocalRankFusion(
  rankings: readonly { ids: readonly string[]; weight?: number }[],
  k = HYBRID_RRF_K,
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    const weight = ranking.weight ?? 1;
    if (!Number.isFinite(weight) || weight <= 0) continue;
    const seen = new Set<string>();
    ranking.ids.forEach((id, index) => {
      if (seen.has(id)) return;
      seen.add(id);
      scores.set(id, (scores.get(id) || 0) + weight / (Math.max(1, k) + index + 1));
    });
  }
  return scores;
}

const evidenceTier = (item: HybridBusiness, specificService: boolean): number => {
  if (!specificService) return 1;
  // Specific products/services must not be falsely advertised from category alone.
  if (item.match_type === "exact_service") return 3;
  if (item.match_type === "category_related") return 0;
  return 1;
};

/**
 * Candidate-limited HybridSearch v2.
 *
 * Non-search / no distinct lexical hits intentionally falls back to GeoRank,
 * protecting location-only discovery. The intent-aware evidence gate keeps
 * known exact service matches above unverified category-only suggestions.
 */
export function rankHybridSearch<T extends HybridBusiness>(
  items: readonly T[],
  query: string,
  radiusMeters: number,
  options: { specificService?: boolean } = {},
): T[] {
  if (!items.length) return [];
  const baseline = sortGeoRank(items, query, radiusMeters);
  if (!query.trim() || items.length < 2) return baseline;

  const scores = bm25CandidateScores(items, query);
  const candidateId = (item:T) => String(item.id ?? item.name ?? "");
  const lexical = items
    .filter(item => (scores.get(candidateId(item)) || 0) > 0)
    .sort((a, b) =>
      (scores.get(candidateId(b)) || 0) - (scores.get(candidateId(a)) || 0) ||
      candidateId(a).localeCompare(candidateId(b)),
    );
  if (!lexical.length) return baseline;

  const fusion = reciprocalRankFusion([
    {ids: baseline.map(candidateId),weight: 1},
    {ids: lexical.map(candidateId),weight: 1.35},
  ]);
  const geoPosition = new Map(baseline.map((item, index) => [candidateId(item), index]));
  const specificService = Boolean(options.specificService);
  return [...items].sort((a, b) => {
    // Product-specific evidence safety applies independently of rank fusion.
    const evidence = evidenceTier(b, specificService) - evidenceTier(a, specificService);
    if (evidence !== 0) return evidence;
    const x = (fusion.get(candidateId(b)) || 0) - (fusion.get(candidateId(a)) || 0);
    if (Math.abs(x) > 1e-12) return x;
    return (geoPosition.get(candidateId(a)) ?? Number.MAX_SAFE_INTEGER) -
      (geoPosition.get(candidateId(b)) ?? Number.MAX_SAFE_INTEGER) ||
      candidateId(a).localeCompare(candidateId(b));
  });
}

/** Controlled rollout: only query searches; geo-only results keep GeoRank. */
export function useHybridV2(query: string, candidateCount: number): boolean {
  return Boolean(query.trim()) && candidateCount >= 2;
}
