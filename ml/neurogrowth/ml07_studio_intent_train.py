#!/usr/bin/env python3
"""ML-07: CPU-only synthetic tri-lingual intent model evaluation.

Trains a small Unicode char n-gram Multinomial Naive Bayes classifier on
SYNTHETIC 12-app EN/TA/SI prompts. This is NOT a vendor-data-trained Growth AI,
not a production model, not language generation, and never grants permissions.
No network, no database, no private data, no GPU or additional dependencies.
"""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
from hashlib import sha256
from math import exp, log
import json
from pathlib import Path
import re
import unicodedata

EXPECTED_LANGS = ("en", "ta", "si")
EXPECTED_APP_IDS = (
    "campaign-planner", "poster-editor", "caption-lab", "brand-kit",
    "social-marketing", "email-marketing", "voice-agent",
    "workflow-automation", "plugin-connectors", "content-calendar",
    "leads-workspace", "leads-crm",
)
CONTRACT = Path(__file__).resolve().parent / "contracts" / "ml07_synthetic_studio_intents.json"
SUSPICIOUS = re.compile(r"(?:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\+?\d[\d \-]{8,}\d)")
CONTROL = re.compile(r"[\x00-\x1f\x7f]")

def load_contract(path: Path = CONTRACT):
    raw = path.read_bytes()
    data = json.loads(raw)
    if data.get("provenance") != "synthetic_only" or data.get("trainingEligibleRealData") is not False:
        raise ValueError("real data is out of scope")
    if data.get("executionsAuthorized") is not False or data.get("customerContactData") is not False:
        raise ValueError("training cannot authorize execution or contact data")
    classes = data.get("classes")
    if not isinstance(classes, list) or [x.get("app_id") for x in classes] != list(EXPECTED_APP_IDS):
        raise ValueError("unknown or reordered 12-app inventory")
    utterances = set()
    for item in classes:
        examples = item.get("language_examples")
        if not isinstance(examples, dict) or set(examples) != set(EXPECTED_LANGS):
            raise ValueError("all three languages required")
        for lang in EXPECTED_LANGS:
            splits = examples[lang]
            if not isinstance(splits, dict) or set(splits) != {"train", "eval"}:
                raise ValueError("training and disjoint evaluation required")
            if len(splits["train"]) != 2 or len(splits["eval"]) != 1:
                raise ValueError("fixed two-train/one-eval split")
            for example in splits["train"] + splits["eval"]:
                if not isinstance(example, str) or not (8 <= len(example) <= 180):
                    raise ValueError("invalid synthetic utterance")
                if SUSPICIOUS.search(example) or CONTROL.search(example):
                    raise ValueError("contact/PII-shaped value forbidden")
                norm = unicodedata.normalize("NFKC", example).casefold().strip()
                if norm in utterances:
                    raise ValueError("training or holdout duplicate")
                utterances.add(norm)
    unknown = data.get("unknown_eval")
    if not isinstance(unknown, list) or len(unknown) != 6:
        raise ValueError("six synthetic out-of-distribution samples required")
    for example in unknown:
        if not isinstance(example, str) or not example or SUSPICIOUS.search(example):
            raise ValueError("unknown evaluation must be synthetic")
        if unicodedata.normalize("NFKC", example).casefold().strip() in utterances:
            raise ValueError("unknown evaluation cannot reuse training utterance")
    return data, sha256(raw).hexdigest()

def grams(value: str) -> Counter:
    clean = unicodedata.normalize("NFKC", value).casefold()
    clean = " ".join(clean.split())
    # Code-point n-grams work for all three scripts without extra tokenizers.
    bounded = "^" + clean + "$"
    return Counter(bounded[i:i+n] for n in (2, 3, 4)
                   for i in range(len(bounded) - n + 1))

class SyntheticIntentNB:
    def __init__(self):
        self.counts = defaultdict(Counter)
        self.totals = Counter()
        self.vocabulary = set()
        self.labels = list(EXPECTED_APP_IDS)
        self.trained_count = 0

    def fit(self, rows):
        for label, phrase in rows:
            if label not in EXPECTED_APP_IDS:
                raise ValueError("unauthorized training label")
            features = grams(phrase)
            self.counts[label].update(features)
            self.totals[label] += sum(features.values())
            self.vocabulary.update(features)
            self.trained_count += 1
        if self.trained_count != 72:
            raise ValueError("expected 72 synthetic training records")
        return self

    def predict(self, phrase: str):
        features = grams(phrase)
        size = max(1, len(self.vocabulary))
        alpha = 1.0
        # Fixed class priors: synthetic design, NOT real observed traffic.
        scores = {}
        for label in self.labels:
            denom = self.totals[label] + alpha * size
            scores[label] = sum(count * log((self.counts[label][gram] + alpha) / denom)
                                for gram, count in features.items())
        ordered = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
        # Score gap is descriptive; no production confidence calibration.
        margin = ordered[0][1] - ordered[1][1]
        return ordered[0][0], margin

def macro_f1(truth, prediction):
    if not truth:
        return 0.0
    classes = EXPECTED_APP_IDS
    results = []
    for label in classes:
        tp = sum(t == label and p == label for t, p in zip(truth, prediction))
        fp = sum(t != label and p == label for t, p in zip(truth, prediction))
        fn = sum(t == label and p != label for t, p in zip(truth, prediction))
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        results.append(2 * precision * recall / (precision + recall)
                       if precision + recall else 0.0)
    return round(sum(results) / len(results), 4)

def train_and_report(data, contract_sha):
    rows = [(item["app_id"], text) for item in data["classes"]
            for lang in EXPECTED_LANGS
            for text in item["language_examples"][lang]["train"]]
    model = SyntheticIntentNB().fit(rows)
    by_lang = {}
    for lang in EXPECTED_LANGS:
        truth, guesses = [], []
        for item in data["classes"]:
            for value in item["language_examples"][lang]["eval"]:
                truth.append(item["app_id"])
                guesses.append(model.predict(value)[0])
        correct = sum(a == b for a, b in zip(truth, guesses))
        by_lang[lang] = {
            "holdout_count": len(truth),
            "accuracy": round(correct / len(truth), 4),
            "macro_f1": macro_f1(truth, guesses),
        }
    unknown_margins = [model.predict(text)[1] for text in data["unknown_eval"]]
    return {
        "version": "ml07-synthetic-only-cpu-baseline-v1",
        "source_sha256": contract_sha,
        "model_family": "unicode_char_ngram_multinomial_naive_bayes",
        "classes": len(EXPECTED_APP_IDS),
        "languages": list(EXPECTED_LANGS),
        "synthetic_training_count": model.trained_count,
        "synthetic_holdout_count": sum(x["holdout_count"] for x in by_lang.values()),
        "unknown_eval_count": len(unknown_margins),
        "holdout_by_language": by_lang,
        "synthetic_not_vendor_accuracy": True,
        "real_vendor_training_authorized": False,
        "production_inference_enabled": False,
        "automated_execution_enabled": False,
        "gating": "BLOCKED: owner consent, real labeled outcomes, grouped heldout validation, human approval and provider permissions",
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--contract", type=Path, default=CONTRACT)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    data, contract_sha = load_contract(args.contract)
    report = train_and_report(data, contract_sha)
    print(json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
