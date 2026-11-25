#!/usr/bin/env python3
"""Offline synthetic-only NeuroGrowth ML-01 ranking demonstration.

NOT A PRODUCTION AGENT. Model logits aren't sale probabilities and do not grant
any dashboard action. This script reads ONLY explicit aggregate 10-float input.
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
import torch

from train import FEATURES, ACTIONS, VERSION, NeuroGrowthMLP


def rank(model_path: str, features: list[float], top: int = 3):
    if len(features) != len(FEATURES):
        raise ValueError(f"Expected {len(FEATURES)} features, got {len(features)}")
    if any(not math.isfinite(v) or v < 0.0 or v > 1.0 for v in features):
        raise ValueError("Each input must be a finite, normalized aggregate in [0,1]")
    if features[-1] < .75:
        raise ValueError("Not enough observed evidence: coverage below 75%; no ranking")
    obj = json.loads(Path(model_path).read_text(encoding="utf8"))
    if (obj.get("model_version") != VERSION or obj.get("research_only") is not True
            or obj.get("features") != list(FEATURES)
            or obj.get("actions") != list(ACTIONS)):
        raise ValueError("Unexpected model version/action/feature schema; refusing to infer")
    model = NeuroGrowthMLP()
    model.load_state_dict({key: torch.tensor(value, dtype=torch.float32)
                           for key, value in obj["weights"].items()}, strict=True)
    model.eval()
    with torch.no_grad():
        logits = model(torch.tensor([features], dtype=torch.float32))[0].tolist()
    ranked = sorted(range(len(ACTIONS)), key=lambda idx: logits[idx], reverse=True)[:top]
    return {
        "research_only": True,
        "trained_on": "synthetic_only",
        "no_vendor_outcome_probability": True,
        "model_version": VERSION,
        "ranked_actions": [{"action": ACTIONS[index], "raw_model_logit": round(logits[index], 6)}
                           for index in ranked],
        "disclaimer": "Simulated action rankings only; no dashboard writes, messages or business impact claims.",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="ml/neurogrowth/model_artifacts/neurogrowth-research-v0.1.json")
    parser.add_argument("--features", nargs=len(FEATURES), type=float, required=True,
                        help="10 normalized aggregate values, in FEATURES order")
    args = parser.parse_args()
    print(json.dumps(rank(args.model, args.features), indent=2))
