#!/usr/bin/env python3
"""SLBI SemanticSearch v3 offline model evaluator.

Dependencies (research environment only):
  python -m pip install 'sentence-transformers>=3,<7' numpy

Input JSON (trusted admin-only export of reviewed PUBLIC business data):
{
 "businesses":[{"id":"uuid","text":"Name. Category. Description..."}],
 "queries":[
   {"query":"யாழ்ப்பாணத்தில் துணிக்கடை",
    "relevance":{"business-uuid":3, "another-uuid":0},
    "baseline_ids":["business-uuid","another-uuid",...]}
 ]
}
No GPS/IP/user identities are needed. Never pass private account records.
"""
import argparse
import json
import math
import os
from pathlib import Path

MODEL_ID = "intfloat/multilingual-e5-small"
MODEL_DIMENSIONS = 384


def dcg(items):
    return sum((2 ** float(v) - 1) / math.log2(rank + 2)
               for rank, v in enumerate(items))


def ndcg_at_k(order, grades, k=10):
    actual = dcg([grades.get(item, 0) for item in order[:k]])
    ideal = dcg(sorted(grades.values(), reverse=True)[:k])
    return actual / ideal if ideal > 0 else 0.0


def precision_at_k(order, grades, k=10):
    top = order[:k]
    return sum(grades.get(x, 0) >= 2 for x in top) / len(top) if top else 0.0


def scores(queries, ids, model):
    import numpy as np
    passages = ["passage: " + str(record["text"])[:1500] for record in ids]
    query_strings = ["query: " + str(record["query"])[:300] for record in queries]
    document_vectors = model.encode(passages, batch_size=8,
                                    normalize_embeddings=True, show_progress_bar=False)
    query_vectors = model.encode(query_strings, batch_size=8,
                                 normalize_embeddings=True, show_progress_bar=False)
    assert document_vectors.shape[1] == MODEL_DIMENSIONS
    assert query_vectors.shape[1] == MODEL_DIMENSIONS
    return np.asarray(query_vectors) @ np.asarray(document_vectors).T


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--minimum-reviewed", type=int, default=100)
    parser.add_argument("--exploratory", action="store_true",
                        help="Allow fewer reviewed queries, but NEVER mark promotion-ready.")
    args = parser.parse_args()

    data = json.loads(args.dataset.read_text(encoding="utf-8"))
    businesses = data.get("businesses", [])
    queries = data.get("queries", [])
    if not businesses or not queries:
        raise SystemExit("Missing real approved businesses or reviewed query judgments")
    ids = [str(b["id"]) for b in businesses]
    if len(ids) != len(set(ids)):
        raise SystemExit("Duplicate business IDs")
    valid = set(ids)
    reviewed = [
        q for q in queries
        if isinstance(q.get("relevance"), dict)
        and any(int(value) >= 2 for value in q["relevance"].values())
        and set(q["relevance"]).issubset(valid)
        and len(q.get("baseline_ids", [])) > 0
    ]
    if len(reviewed) < args.minimum_reviewed and not args.exploratory:
        raise SystemExit(
            f"Only {len(reviewed)} independently reviewed queries; "
            f"need >= {args.minimum_reviewed} before release benchmarking."
        )
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(MODEL_ID)
    similarities = scores(reviewed, businesses, model)
    reports = []
    for row_index, query in enumerate(reviewed):
        grades = {str(k): int(v) for k, v in query["relevance"].items()}
        ranked_ids = sorted(range(len(ids)),
                            key=lambda index: (-float(similarities[row_index, index]), ids[index]))
        semantic_ids = [ids[index] for index in ranked_ids]
        baseline_ids = [str(item) for item in query["baseline_ids"] if str(item) in valid]
        reports.append({
            "baseline_ndcg10": ndcg_at_k(baseline_ids, grades),
            "semantic_ndcg10": ndcg_at_k(semantic_ids, grades),
            "baseline_p10": precision_at_k(baseline_ids, grades),
            "semantic_p10": precision_at_k(semantic_ids, grades),
        })
    mean = lambda key: round(sum(row[key] for row in reports) / max(1,len(reports)), 5)
    baseline_ndcg = mean("baseline_ndcg10")
    semantic_ndcg = mean("semantic_ndcg10")
    out = {
        "algorithm": "SLBI SemanticSearch v3 research",
        "model_id": MODEL_ID,
        "embedding_dimensions": MODEL_DIMENSIONS,
        "reviewed_queries": len(reviewed),
        "approved_businesses": len(ids),
        "baseline_ndcg10": baseline_ndcg,
        "semantic_ndcg10": semantic_ndcg,
        "baseline_p10": mean("baseline_p10"),
        "semantic_p10": mean("semantic_p10"),
        "release_eligible": (
            not args.exploratory
            and len(reviewed) >= args.minimum_reviewed
            and semantic_ndcg > baseline_ndcg + 0.02
            and mean("semantic_p10") >= mean("baseline_p10")
        ),
        "notes": [
            "Model-only retrieval compared with provided production baseline order.",
            "Evaluate hybrid RRF separately before promotion.",
            "Per-language Sinhala/Tamil regression gates are required in addition to aggregate scores.",
            "No network/GPU/performance SLO is inferred from this offline model-quality run.",
        ],
    }
    args.report.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(out,ensure_ascii=False,indent=2))


if __name__ == "__main__":
    main()
