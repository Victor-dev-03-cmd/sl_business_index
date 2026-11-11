/**
 * Experimental, explicitly opt-in SemanticSearch v3 re-ranking.
 * Genuine revision-pinned multilingual E5-small vectors are computed offline
 * and quantized to int8. This is NOT an arbitrary-query inference service.
 * Only six known, dictionary-canonicalized intents are supported. Unknown,
 * stale or incomplete inputs return the unchanged HybridSearch v2 ordering.
 * Approval/geo/category/service evidence checks always run before this step.
 */
import { reciprocalRankFusion } from "./hybridSearch.ts";
import { E5_BETA } from "./semantic-v3-beta-vectors.ts";

export const E5_BETA_MODEL = "intfloat/multilingual-e5-small";
export const E5_BETA_REVISION = "614241f622f53c4eeff9890bdc4f31cfecc418b3";

type Candidate = { id?: string | number; name?: string | null; category?: string | null; match_type?: string | null };
export type BetaRanking<T> = { items: T[]; active: boolean; reason: string; model: string | null };

const clean = (value: string | null | undefined) => String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase();
const candidateId = (row: Candidate) => String(row.id ?? "");
const documentIndex = new Map(E5_BETA.businesses.map((row) => [row.id, row]));
const queryIndex = new Map(E5_BETA.canonical_queries.map((row) => [clean(row.query), row]));
const vectorCache = new Map<string, Int8Array>();

function decodeVector(base64: string): Int8Array | null {
  const cached = vectorCache.get(base64);
  if (cached) return cached;
  if (base64.length !== E5_BETA.dimensions * 4 / 3 && base64.length !== Math.ceil(E5_BETA.dimensions / 3) * 4) return null;
  try {
    const binary = atob(base64);
    if (binary.length !== E5_BETA.dimensions) return null;
    const vector = new Int8Array(binary.length);
    for (let i = 0; i < binary.length; i++) vector[i] = binary.charCodeAt(i) > 127 ? binary.charCodeAt(i) - 256 : binary.charCodeAt(i);
    vectorCache.set(base64, vector);
    return vector;
  } catch {
    return null;
  }
}

function cosineApproximate(a: Int8Array, b: Int8Array): number {
  if (a.length !== b.length || a.length !== E5_BETA.dimensions) return Number.NaN;
  let dot = 0, normA = 0, normB = 0;
  for (let i=0; i<a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA > 0 && normB > 0 ? dot / Math.sqrt(normA * normB) : Number.NaN;
}

export function hasSupportedE5BetaIntent(query: string): boolean {
  return queryIndex.has(clean(query));
}

export function rankSemanticV3Beta<T extends Candidate>(
  baseline: readonly T[],
  canonicalQuery: string,
  options: { optedIn: boolean; specificService?: boolean },
): BetaRanking<T> {
  const fallback = (reason: string): BetaRanking<T> => ({ items:[...baseline], active:false, reason, model:null });
  if (!options.optedIn) return fallback("disabled");
  if (!canonicalQuery.trim() || baseline.length < 2) return fallback("no-search-or-candidates");
  if (E5_BETA.model_id !== E5_BETA_MODEL || E5_BETA.model_revision !== E5_BETA_REVISION ||
      E5_BETA.encoding !== "int8-base64-normalized" || E5_BETA.dimensions !== 384 ||
      E5_BETA.dataset_label_type !== "category-proxy-not-human-judged") return fallback("model-provenance");
  const query = queryIndex.get(clean(canonicalQuery));
  if (!query) return fallback("unsupported-intent");
  const queryVector = decodeVector(query.vector);
  if (!queryVector) return fallback("invalid-query-vector");

  const scores: { id: string; similarity: number }[] = [];
  const unique = new Set<string>();
  for (const row of baseline) {
    const id = candidateId(row);
    if (!id || unique.has(id)) return fallback("invalid-candidates");
    unique.add(id);
    const doc = documentIndex.get(id);
    if (!doc || clean(row.name) !== clean(doc.name) || clean(row.category) !== clean(doc.category)) continue;
    const vector = decodeVector(doc.vector);
    if (!vector) return fallback("invalid-business-vector");
    const similarity = cosineApproximate(queryVector, vector);
    if (!Number.isFinite(similarity)) return fallback("invalid-similarity");
    scores.push({ id, similarity });
  }
  if (scores.length < 2 || scores.length / baseline.length < 0.95) return fallback("stale-or-incomplete-index");

  scores.sort((a,b) => b.similarity-a.similarity || a.id.localeCompare(b.id));
  const positions = new Map(baseline.map((item,i) => [candidateId(item),i]));
  const fused = reciprocalRankFusion([
    { ids: baseline.map(candidateId), weight: 1.0 },
    { ids: scores.map(row => row.id), weight: 0.5 },
  ]);
  const evidence = (row:T) => !options.specificService ? 1 :
    row.match_type === "exact_service" ? 3 : row.match_type === "category_related" ? 0 : 1;
  const ranked = [...baseline].sort((a,b) =>
    evidence(b) - evidence(a) ||
    (fused.get(candidateId(b)) ?? 0) - (fused.get(candidateId(a)) ?? 0) ||
    (positions.get(candidateId(a)) ?? Number.MAX_SAFE_INTEGER) - (positions.get(candidateId(b)) ?? Number.MAX_SAFE_INTEGER)
  );
  return {items:ranked, active:true, reason:"model-reranked",model:E5_BETA_MODEL+"@"+E5_BETA_REVISION.slice(0,8)};
}
