#!/usr/bin/env python3
"""SLBI SemanticSearch v3 reproducible multilingual model benchmark.

Optional offline research dependency: pip install sentence-transformers numpy
No production credentials, Supabase connection, GPS or user query logs needed.
This does NOT fabricate vectors or claim human-labelled business relevance.
"""
from __future__ import annotations
import argparse
import base64
import hashlib
import json
import math
import sys
import time
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "tests" / "fixtures" / "semantic-v3-category-proxy.json"
PINNED_E5_REVISION = "614241f622f53c4eeff9890bdc4f31cfecc418b3"

def ndcg_at_k(ids: list[str], relevant: set[str], k: int = 10) -> float:
    def gain(index: int) -> float:
        return 7.0 / math.log2(index + 2)
    ideal = sum(gain(i) for i in range(min(k, len(relevant))))
    actual = sum(gain(i) for i, key in enumerate(ids[:k]) if key in relevant)
    return actual / ideal if ideal > 0 else 0

def precision_at_k(ids: list[str], relevant: set[str], k: int = 10) -> float:
    return sum(key in relevant for key in ids[:k]) / k

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="intfloat/multilingual-e5-small")
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--model-revision", default=None, help="Full immutable 40-character model commit SHA")
    parser.add_argument("--max-queries", type=int, default=240)
    parser.add_argument("--query-mode", choices=["raw","canonical"], default="raw")
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--export-vectors", type=Path, default=None)
    parser.add_argument("--export-beta-fixture", type=Path, default=None)
    args = parser.parse_args()
    try:
        import numpy as np
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("Install optional research dependencies: pip install sentence-transformers numpy", file=sys.stderr)
        return 2
    data = json.loads(DATASET.read_text(encoding="utf-8"))
    if data["human_judged"] is not False:
        raise ValueError("Expected category-proxy dataset, not native-speaker labels")
    docs = data["candidates"]
    queries = data["queries"][:args.max_queries]
    print(f"Loading {args.model}; model downloads and CPU time depend on the environment", file=sys.stderr)
    started = time.perf_counter()
    from huggingface_hub import model_info
    # Never resolve a moving model HEAD. The benchmark is invalid if future
    # Hugging Face updates silently replace the exact model under test.
    if args.model_revision is None and args.model != "intfloat/multilingual-e5-small":
        raise ValueError("Non-default models require --model-revision")
    model_revision = args.model_revision or PINNED_E5_REVISION
    if len(model_revision) != 40 or any(ch not in "0123456789abcdef" for ch in model_revision):
        raise ValueError("Model revision must be an immutable lowercase 40-character commit SHA")
    resolved_revision = model_info(args.model, revision=model_revision).sha
    if resolved_revision != model_revision:
        raise ValueError("Downloaded model revision differs from requested commit SHA")
    encoder = SentenceTransformer(args.model, revision=model_revision, trust_remote_code=False)
    # E5 models require query/passsage task prefixes. Other model families must
    # use their specified text preprocessing; never compare different model spaces.
    e5 = "e5" in args.model.lower()
    docs_text = [
        ("passage: " if e5 else "") + f"{row['name']}. Category: {row['category']}."
        for row in docs
    ]
    query_text = [("query: " if e5 else "") +
                  (row["canonical_query"] if args.query_mode == "canonical" else row["query"])
                  for row in queries]
    d_vectors = encoder.encode(docs_text, batch_size=args.batch_size,
                               normalize_embeddings=True, convert_to_numpy=True,
                               show_progress_bar=False)
    started_queries = time.perf_counter()
    q_vectors = encoder.encode(query_text, batch_size=args.batch_size,
                               normalize_embeddings=True, convert_to_numpy=True,
                               show_progress_bar=False)
    query_ms = (time.perf_counter()-started_queries)*1000/len(queries)
    similarity = np.matmul(q_vectors, d_vectors.T)
    by_language = defaultdict(lambda: {"queries": 0, "ndcg_at10": 0.0, "precision_at10": 0.0})
    for row, vector in zip(queries, similarity):
        ranked = sorted(range(len(docs)), key=lambda i: (-float(vector[i]), docs[i]["id"]))
        ids = [docs[i]["id"] for i in ranked]
        relevant = set(row["relevant_business_ids"])
        stats = by_language[row["language"]]
        stats["queries"] += 1
        stats["ndcg_at10"] += ndcg_at_k(ids, relevant)
        stats["precision_at10"] += precision_at_k(ids, relevant)
    results = {
        "model":args.model,
        "model_revision":model_revision,
        "query_mode":args.query_mode,
        "model_dimension":int(d_vectors.shape[1]),
        "query_count":len(queries),
        "business_count":len(docs),
        "dataset_label_type":"category-proxy-not-human-judged",
        "language_breakdown":{
          lang:{
            "queries":stats["queries"],
            "ndcg_at10":round(stats["ndcg_at10"]/stats["queries"],4),
            "precision_at10":round(stats["precision_at10"]/stats["queries"],4)
          } for lang,stats in sorted(by_language.items())
        },
        "mean_query_embed_ms":round(query_ms,2),
        "elapsed_seconds":round(time.perf_counter()-started,2),
        "production_ready":False,
        "missing_production_gates":[
          "100+ independent native-speaker query judgments",
          "same model and revision for approved business vectors and queries",
          "real live query p95 latency", "nDCG@10 production baseline non-regression",
          "approved data refresh pipeline", "reviewed gradual rollout flag"
        ]
    }
    report=json.dumps(results,ensure_ascii=False,indent=2)
    print(report)
    if args.export_vectors:
        if args.query_mode != "canonical":
            raise ValueError("Export only from the canonical model-benchmark pass")
        export = {
          "schema_version": 1,
          "dataset_sha256": hashlib.sha256(DATASET.read_bytes()).hexdigest(),
          "embedding_dimensions": int(d_vectors.shape[1]),
          "model_id": args.model,
          "model_revision": model_revision,
          "content_template": "passage: {name}. Category: {category}.",
          "source": "approved business name/category snapshot; not full service descriptions",
          "businesses": [
            {"business_id": row["id"],
             "content_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
             "embedding": [float(x) for x in vector.tolist()]}
            for row, text, vector in zip(docs, docs_text, d_vectors)
          ]
        }
        if len({row["id"] for row in docs}) != len(docs):
            raise ValueError("Duplicate business IDs in export snapshot")
        if not np.isfinite(d_vectors).all() or not np.allclose(
            np.linalg.norm(d_vectors, axis=1), 1.0, rtol=0, atol=0.005
        ):
            raise ValueError("Business vectors are nonfinite or not normalized")
        args.export_vectors.parent.mkdir(parents=True,exist_ok=True)
        args.export_vectors.write_text(json.dumps(export,ensure_ascii=False),encoding="utf-8")
    if args.export_beta_fixture:
        if args.query_mode != "canonical" or args.model != "intfloat/multilingual-e5-small":
            raise ValueError("Beta fixture requires pinned multilingual E5 canonical pass")
        canonical_queries = sorted({row["canonical_query"].strip() for row in queries})
        if not canonical_queries or len(canonical_queries) > 50:
            raise ValueError("Unexpected canonical query coverage")
        canonical_vectors = encoder.encode(
            ["query: " + query for query in canonical_queries],
            batch_size=args.batch_size, normalize_embeddings=True,
            convert_to_numpy=True, show_progress_bar=False,
        )
        if not np.isfinite(canonical_vectors).all():
            raise ValueError("Nonfinite query vectors")
        def pack(vector):
            # Compact int8 quantization of genuine normalized E5 model output.
            # Runtime cosine is approximate (quantized), never fabricated.
            return base64.b64encode(np.rint(np.clip(vector, -1, 1) * 127).astype(np.int8).tobytes()).decode("ascii")
        beta = {
            "schema_version": 1,
            "model_id": args.model,
            "model_revision": model_revision,
            "dimensions": int(d_vectors.shape[1]),
            "encoding": "int8-base64-normalized",
            "dataset_sha256": hashlib.sha256(DATASET.read_bytes()).hexdigest(),
            "dataset_label_type": "category-proxy-not-human-judged",
            "source": "approved business name and category only; experimental opt-in",
            "businesses": [
                {"id": row["id"], "name": row["name"], "category": row["category"],
                 "vector": pack(vector)}
                for row, vector in zip(docs, d_vectors)
            ],
            "canonical_queries": [
                {"query": query, "vector": pack(vector)}
                for query, vector in zip(canonical_queries, canonical_vectors)
            ],
        }
        args.export_beta_fixture.parent.mkdir(parents=True, exist_ok=True)
        args.export_beta_fixture.write_text("export const E5_BETA = " + json.dumps(beta, ensure_ascii=False, separators=(",", ":")) + " as const;\n", encoding="utf-8")
        print(f"Experimental E5 beta fixture: {len(docs)} approved snapshot businesses, {len(canonical_queries)} canonical intents", file=sys.stderr)
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(report,encoding="utf-8")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
