#!/usr/bin/env python3
"""ML-04 research-only: apples-to-apples neural vs rules/tree on synthetic ML-03 panel.

NO production connection, customer data, real sales labels or vendor mutation.
Use business-disjoint AND forward-time test partitions. Fit models and calibrate
temperature on train/validation only; do not tune on the held-out test set.
"""
from __future__ import annotations

import argparse
import copy
import json
import random
from pathlib import Path

import numpy as np
import torch
from torch import nn
from sklearn.ensemble import HistGradientBoostingClassifier

from ml03_evaluate import ACTIONS, FEATURES, metrics, rule, split, synthetic_panel


class SmallMLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(len(FEATURES), 48), nn.GELU(),
            nn.Dropout(0.08), nn.Linear(48, 32), nn.GELU(),
            nn.Linear(32, len(ACTIONS)),
        )

    def forward(self, x):
        return self.net(x)


class ResidualTabularMLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.stem = nn.Sequential(nn.Linear(len(FEATURES), 48), nn.LayerNorm(48), nn.GELU())
        self.residual = nn.Sequential(
            nn.Linear(48, 48), nn.GELU(),
            nn.Dropout(0.08), nn.Linear(48, 48),
        )
        self.head = nn.Sequential(nn.LayerNorm(48), nn.GELU(), nn.Linear(48, len(ACTIONS)))

    def forward(self, x):
        h = self.stem(x)
        return self.head(h + self.residual(h))


def probabilities(logits, temperature=1.0):
    shifted = logits.astype(np.float64) / temperature
    shifted -= np.max(shifted, axis=1, keepdims=True)
    exps = np.exp(shifted)
    return exps / exps.sum(axis=1, keepdims=True)


def temp_nll(logits, y, temperature):
    p = probabilities(logits, temperature)
    return float(-np.log(np.maximum(p[np.arange(len(y)), y], 1e-12)).mean())


def choose_temperature(val_logits, val_y):
    """Choose temperature using VALIDATION ONLY, not test."""
    candidates = (0.7, 1.0, 1.3, 1.7, 2.2, 3.0)
    return min(candidates, key=lambda temp: temp_nll(val_logits, val_y, temp))


def calibration_ece(probs, labels, bins=10):
    confidence = np.max(probs, axis=1)
    predicted = np.argmax(probs, axis=1)
    result = 0.0
    for lower in np.linspace(0, 1, bins, endpoint=False):
        upper = lower + 1 / bins
        mask = (confidence >= lower) & (confidence < upper if upper < 1 else confidence <= upper)
        if np.any(mask):
            result += float(np.mean(mask)) * abs(float(np.mean(predicted[mask] == labels[mask])) - float(np.mean(confidence[mask])))
    return round(result, 4)


def rank_metrics(labels, logits, temperature):
    probs = probabilities(logits, temperature)
    predictions = probs.argmax(axis=1)
    result = metrics(labels, predictions)
    result["top3_action_hit_rate"] = round(float(np.mean([label in np.argsort(-row)[:3] for label, row in zip(labels, probs)])), 4)
    threshold = 0.70
    selected = np.max(probs, axis=1) >= threshold
    result["selective_confidence_threshold"] = threshold
    result["coverage_at_threshold"] = round(float(np.mean(selected)), 4)
    result["selective_accuracy_at_threshold"] = round(float(np.mean(predictions[selected] == labels[selected])), 4) if np.any(selected) else None
    result["top_label_ece_synthetic"] = calibration_ece(probs, labels)
    result["validation_fitted_temperature"] = temperature
    return result


def logits_for(net, x):
    net.eval()
    with torch.no_grad():
        return net(torch.from_numpy(np.asarray(x, dtype=np.float32))).cpu().numpy()


def fit_network(x, y, tr, va, architecture="small_mlp", seed=42, epochs=65):
    """Train only on tr; all epoch selection and temperature fitting use va."""
    if architecture not in ("small_mlp", "residual_mlp"):
        raise ValueError("architecture is not registered")
    if epochs < 1:
        raise ValueError("epochs must be positive")
    torch.set_num_threads(2)
    torch.manual_seed(seed)
    np.random.seed(seed)
    random.seed(seed)
    net = SmallMLP() if architecture == "small_mlp" else ResidualTabularMLP()
    optim = torch.optim.AdamW(net.parameters(), lr=0.003, weight_decay=0.004)
    train_x = torch.from_numpy(x[tr])
    train_y = torch.from_numpy(y[tr].astype(np.int64))
    val_x = torch.from_numpy(x[va])
    val_y = torch.from_numpy(y[va].astype(np.int64))
    counts = np.bincount(y[tr], minlength=len(ACTIONS)).astype(np.float64)
    weights = 1 / np.sqrt(np.maximum(counts, 1))
    weights = np.minimum(weights / np.mean(weights), 3.0)
    loss_fn = nn.CrossEntropyLoss(weight=torch.tensor(weights, dtype=torch.float32))
    validation_loss = nn.CrossEntropyLoss()
    loader = torch.utils.data.DataLoader(
        torch.utils.data.TensorDataset(train_x, train_y),
        batch_size=256, shuffle=True, generator=torch.Generator().manual_seed(seed),
    )
    best_loss = float("inf")
    best_state = None
    best_epoch = 0
    stale = 0
    for epoch in range(1, epochs + 1):
        net.train()
        for bx, by in loader:
            optim.zero_grad(set_to_none=True)
            loss = loss_fn(net(bx), by)
            loss.backward()
            nn.utils.clip_grad_norm_(net.parameters(), max_norm=1.0)
            optim.step()
        net.eval()
        with torch.no_grad():
            current_loss = float(validation_loss(net(val_x), val_y).item())
        if current_loss < best_loss - 0.0002:
            best_loss = current_loss
            best_epoch = epoch
            best_state = copy.deepcopy(net.state_dict())
            stale = 0
        else:
            stale += 1
            if stale >= 12:
                break
    if best_state is None:
        raise RuntimeError("no checkpoint selected")
    net.load_state_dict(best_state)
    val_logits = logits_for(net, x[va])
    temperature = choose_temperature(val_logits, y[va])
    val_predictions = probabilities(val_logits, temperature).argmax(axis=1)
    return net, {
        "architecture": architecture,
        "seed": seed,
        "best_epoch": best_epoch,
        "validation_macro_f1": metrics(y[va], val_predictions)["macro_f1"],
        "validation_accuracy": metrics(y[va], val_predictions)["accuracy"],
        "validation_fitted_temperature": temperature,
    }


def benchmark(businesses=600, seed=42, epochs=65, neural_seeds=(7, 42)):
    x, y, ids, months = synthetic_panel(businesses, seed)
    tr, va, te = split(ids, months, seed)
    assert set(ids[tr]).isdisjoint(ids[va]) and set(ids[tr]).isdisjoint(ids[te]) and set(ids[va]).isdisjoint(ids[te])
    assert months[tr].max() < months[va].min() < months[te].min()
    majority = int(np.bincount(y[tr], minlength=len(ACTIONS)).argmax())
    tree = HistGradientBoostingClassifier(
        max_iter=75, max_leaf_nodes=12, l2_regularization=2.0, learning_rate=0.06, random_state=seed,
    )
    tree.fit(x[tr], y[tr])
    baseline = {
        "majority": metrics(y[te], np.full(te.sum(), majority)),
        "fixed_heuristic": metrics(y[te], rule(x[te])),
        "hist_gradient_boosting": metrics(y[te], tree.predict(x[te])),
    }
    runs = []
    for arch in ("small_mlp", "residual_mlp"):
        for neural_seed in neural_seeds:
            net, record = fit_network(x, y, tr, va, arch, neural_seed, epochs)
            test_logits = logits_for(net, x[te])
            record["test"] = rank_metrics(y[te], test_logits, record["validation_fitted_temperature"])
            runs.append(record)
    # Select from validation results only. Test metrics are for final reporting, not tuning.
    selected = max(runs, key=lambda r: (r["validation_macro_f1"], r["validation_accuracy"], -r["seed"]))
    return {
        "research_only": True,
        "dataset_type": "fully_synthetic_monthly_simulation",
        "real_business_validation": False,
        "revenue_probability_or_growth_lift": None,
        "seed": seed,
        "evaluation": "SAME ML-03 test panel, business-disjoint AND forward time",
        "split": {
            "train_businesses": len(set(ids[tr])), "validation_businesses": len(set(ids[va])),
            "test_businesses": len(set(ids[te])),
            "train_rows": int(tr.sum()), "validation_rows": int(va.sum()), "test_rows": int(te.sum()),
        },
        "baselines": baseline,
        "neural_runs": runs,
        "validation_selected_neural": {
            "architecture": selected["architecture"], "seed": selected["seed"],
            "selection_metric": "validation_macro_f1_then_validation_accuracy",
            "test": selected["test"],
        },
        "disclaimer": "Confidence measures synthetic action-class uncertainty, NOT sales probability; no real vendor labels.",
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--businesses", type=int, default=600)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--epochs", type=int, default=65)
    p.add_argument("--output", default="")
    args = p.parse_args()
    result = json.dumps(benchmark(args.businesses, args.seed, args.epochs), indent=2, sort_keys=True)
    if args.output:
        target = Path(args.output)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(result + "\n", encoding="utf-8")
    print(result)
