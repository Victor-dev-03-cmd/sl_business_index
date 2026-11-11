#!/usr/bin/env python3
"""SLBI SemanticSearch v3 reproducible multilingual model benchmark.

Optional offline research dependency: pip install sentence-transformers numpy
No production credentials, Supabase connection, GPS or user query logs needed.
This does NOT fabricate vectors or claim human-labelled business relevance.
"""
from __future__ import annotations
import argparse
import json
import math
import sys
import time
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
DATASET = ROOT / "tests" / "fixtures" / "semantic-v3-category-proxy.json"

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
    parser.add_argument("--max-queries", type=int, default=240)
    parser.add_argument("--query-mode", choices=["raw","canonical"], default="raw")
    parser.add_argument("--output", type=Path, default=None)
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
    encoder = SentenceTransformer(args.model, trust_remote_code=False)
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
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(report,encoding="utf-8")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
