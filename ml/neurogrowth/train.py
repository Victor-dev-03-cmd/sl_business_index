#!/usr/bin/env python3
"""NeuroGrowth ML-01: synthetic-only research training; never production-ready.

Creates 1 synthetic, aggregate-only record per simulated business with 10 features.
The hidden simulator's action labels are NOT real-world business ground truth.
No customer records or production DB access. Can run on CPU or Colab GPU.
"""
from __future__ import annotations
import argparse
import json
import math
import random
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

FEATURES = (
    "listing_gaps", "unanswered_lead_ratio", "overdue_reminder_ratio",
    "unanswered_review_ratio", "recent_views_norm", "call_click_rate",
    "recent_enquiries_norm", "campaign_staleness", "business_age_norm",
    "evidence_coverage",
)
ACTIONS = (
    "improve_listing", "followup_leads", "reply_reviews",
    "improve_contact", "prepare_campaign",
)
VERSION = "neurogrowth-research-v0.1"


def make_synthetic(seed: int, size: int):
    """Non-linear, noisy research simulator; one row per synthetic business."""
    if size < 200:
        raise ValueError("At least 200 synthetic businesses needed for meaningful splits")
    rng = np.random.default_rng(seed)
    x = rng.beta(1.6, 2.4, size=(size, len(FEATURES))).astype(np.float32)
    # Simulate fewer recorded calls for some relatively visible businesses.
    x[:, 5] = rng.beta(1.2, 7.0, size=size)
    x[:, 9] = rng.uniform(0.75, 1.0, size=size)  # observed evidence coverage
    gaps, new, overdue, unanswered, views, calls, enquiries, stale, age, coverage = x.T
    utility = np.column_stack([
        1.5 * gaps + 0.55 * gaps * (1.0 - coverage) + 0.22 * age,
        1.2 * new + 1.5 * overdue + 0.8 * new * enquiries,
        1.9 * unanswered + 0.5 * unanswered * views,
        1.35 * views * (1.0 - calls) + 0.25 * (1 - coverage),
        1.3 * stale + 0.55 * views * (1.0 - enquiries) + 0.18 * age,
    ]).astype(np.float32)
    utility += rng.normal(0, 0.16, utility.shape).astype(np.float32)
    y = utility.argmax(axis=1).astype(np.int64)
    return x, y


class NeuroGrowthMLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(len(FEATURES), 32), nn.GELU(),
            nn.Linear(32, 24), nn.GELU(),
            nn.Linear(24, len(ACTIONS)),
        )

    def forward(self, x):
        return self.network(x)


def score(net, x, y, device):
    net.eval()
    with torch.no_grad():
        predictions = net(torch.tensor(x, device=device)).argmax(dim=1).cpu().numpy()
    return float((predictions == y).mean())


def train(seed=42, size=2500, epochs=75, output="model_artifacts/neurogrowth-research-v0.1.json"):
    torch.manual_seed(seed)
    np.random.seed(seed)
    random.seed(seed)
    x, y = make_synthetic(seed, size)
    rng = np.random.default_rng(seed + 1)
    ids = rng.permutation(size)
    train_end, val_end = int(size * .7), int(size * .85)
    tr, va, te = ids[:train_end], ids[train_end:val_end], ids[val_end:]
    device = "cuda" if torch.cuda.is_available() else "cpu"
    net = NeuroGrowthMLP().to(device)
    optimizer = torch.optim.AdamW(net.parameters(), lr=.006, weight_decay=.0005)
    loss_fn = nn.CrossEntropyLoss()
    loader = DataLoader(TensorDataset(torch.tensor(x[tr]), torch.tensor(y[tr])),
                        batch_size=96, shuffle=True,
                        generator=torch.Generator().manual_seed(seed))
    best = math.inf
    patience = 12
    bad = 0
    best_state = None
    best_epoch = 0
    for epoch in range(1, epochs + 1):
        net.train()
        for batch_x, batch_y in loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad(set_to_none=True)
            loss = loss_fn(net(batch_x), batch_y)
            loss.backward()
            nn.utils.clip_grad_norm_(net.parameters(), max_norm=1.0)
            optimizer.step()
        net.eval()
        with torch.no_grad():
            val_loss = float(loss_fn(net(torch.tensor(x[va], device=device)),
                                     torch.tensor(y[va], device=device)).item())
        if val_loss < best - .0005:
            best, bad, best_epoch = val_loss, 0, epoch
            best_state = {key: value.detach().cpu().clone() for key, value in net.state_dict().items()}
        else:
            bad += 1
            if bad >= patience:
                break
    assert best_state is not None
    net.load_state_dict(best_state)
    test_accuracy = score(net, x[te], y[te], device)
    val_accuracy = score(net, x[va], y[va], device)
    # A straightforward, non-trained baseline: choose the most frequent action
    # among TRAIN businesses. Never choose its label from test businesses.
    majority_action = int(np.bincount(y[tr], minlength=len(ACTIONS)).argmax())
    majority_accuracy = float((y[te] == majority_action).mean())
    net.eval()
    with torch.no_grad():
        test_pred = net(torch.tensor(x[te], device=device)).argmax(dim=1).cpu().numpy()
    baseline_pred = np.full(len(te), majority_action, dtype=np.int64)
    def macro_f1(pred):
        f1s = []
        recalls = {}
        for index, action in enumerate(ACTIONS):
            tp = int(((pred == index) & (y[te] == index)).sum())
            fp = int(((pred == index) & (y[te] != index)).sum())
            fn = int(((pred != index) & (y[te] == index)).sum())
            precision = tp / (tp + fp) if tp + fp else 0.0
            recall = tp / (tp + fn) if tp + fn else 0.0
            f1s.append(2 * precision * recall / (precision + recall) if precision + recall else 0.0)
            recalls[action] = round(recall, 4)
        return round(float(np.mean(f1s)), 4), recalls
    test_macro_f1, class_recalls = macro_f1(test_pred)
    baseline_macro_f1, _ = macro_f1(baseline_pred)
    metrics = {
        "research_only": True,
        "dataset_type": "fully_synthetic_hidden_utility_simulator",
        "real_business_validation": False,
        "real_business_accuracy_claim": None,
        "model_version": VERSION,
        "random_seed": seed,
        "businesses_synthetic": size,
        "train": len(tr), "validation": len(va), "test": len(te),
        "trained_epochs": best_epoch,
        "validation_accuracy_synthetic": round(val_accuracy, 4),
        "test_accuracy_synthetic": round(test_accuracy, 4),
        "majority_baseline_accuracy_synthetic": round(majority_accuracy, 4),
        "test_macro_f1_synthetic": test_macro_f1,
        "majority_baseline_macro_f1_synthetic": baseline_macro_f1,
        "test_recall_by_action_synthetic": class_recalls,
        "device": device,
        "action_distribution_train": {
            action: int((y[tr] == idx).sum()) for idx, action in enumerate(ACTIONS)
        },
        "note": "Research smoke test only; simulated labels are NOT evidence of vendor growth.",
    }
    payload = {
        "model_version": VERSION,
        "research_only": True,
        "export_format": "torch_state_dict_json",
        "features": list(FEATURES),
        "actions": list(ACTIONS),
        "architecture": "10-32-GELU-24-GELU-5 (logits)",
        "weights": {key: value.numpy().tolist() for key, value in best_state.items()},
        "metrics": metrics,
    }
    target = Path(output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    target.with_suffix(".metrics.json").write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf8")
    print(json.dumps(metrics, indent=2))
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--size", type=int, default=2500)
    parser.add_argument("--epochs", type=int, default=75)
    parser.add_argument("--output", default="model_artifacts/neurogrowth-research-v0.1.json")
    args = parser.parse_args()
    train(args.seed, args.size, args.epochs, args.output)
