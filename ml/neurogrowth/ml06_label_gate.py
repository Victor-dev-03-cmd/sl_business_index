#!/usr/bin/env python3
"""NeuroGrowth ML-06: deny-by-default SYNTHETIC longitudinal label validation.

Demonstrates privacy and leakage checks for eventual consented aggregate labels.
No production connectors, raw customers, secrets, real vendor IDs or model training.
Inputs only accept "sim-" business tokens and mock_verified_history provenance.
"""
from __future__ import annotations

import argparse
import json
import random
import re
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

FEATURES=(
    "listing_gaps","unanswered_lead_ratio","overdue_reminder_ratio",
    "unanswered_review_ratio","recent_views_norm","call_click_rate",
    "recent_enquiries_norm","campaign_staleness","business_age_norm",
    "evidence_coverage",
)
ACTIONS=(
    "improve_listing","followup_leads","reply_reviews",
    "improve_contact","prepare_campaign",
)
FEATURE_VERSION="neurogrowth-ml02-research-features-v1"
LABEL_VERSION="neurogrowth-ml06-observed-action-v0"
PROVENANCE="mock_verified_history"
MIN_COVERAGE=.75
MIN_HELDOUT_CLASS_SUPPORT=10
SAMPLE_KEYS=frozenset({
    "synthetic_group","owner_scoped","approved_listing",
    "consent_training_opt_in","consent_not_revoked","consent_active_at",
    "feature_version","features","feature_snapshot_at",
    "action_type","action_recorded_at","observation_window_end",
    "observation_window_complete","observed_outcome",
    "outcome_recorded_at","source_provenance","label_version",
})
BUSINESS_GROUP=re.compile(r"^sim-[0-9]{4,8}$")


def parse_utc(value):
    if not isinstance(value,str) or not value.endswith("Z"):
        raise ValueError("timestamps must be UTC ISO with Z")
    try:
        result=datetime.fromisoformat(value[:-1]+"+00:00")
    except ValueError as exc:
        raise ValueError("invalid UTC timestamp") from exc
    if result.utcoffset()!=timedelta(0):
        raise ValueError("invalid UTC offset")
    return result


def validate_observation(row,cutoff):
    """Fail closed, never strip/forward extra columns. Returns only a safe class code."""
    if not isinstance(row,dict) or frozenset(row)!=SAMPLE_KEYS:
        return None,"unexpected_or_missing_columns"
    if not isinstance(row["synthetic_group"],str) or not BUSINESS_GROUP.fullmatch(row["synthetic_group"]):
        return None,"synthetic_only_group_required"
    if any(row[k] is not True for k in ("owner_scoped","approved_listing",
                                         "consent_training_opt_in","consent_not_revoked",
                                         "consent_active_at")):
        return None,"unverified_owner_or_consent"
    if row["feature_version"]!=FEATURE_VERSION or row["label_version"]!=LABEL_VERSION:
        return None,"version_mismatch"
    if row["source_provenance"]!=PROVENANCE:
        return None,"mock_provenance_only"
    if row["action_type"] not in ACTIONS or row["observed_outcome"] not in ("completed","not_completed"):
        return None,"unknown_action_or_outcome"
    if row["observation_window_complete"] is not True:
        return None,"unobserved_outcome_cannot_be_negative"
    features=row["features"]
    if not isinstance(features,dict) or frozenset(features)!=frozenset(FEATURES):
        return None,"unexpected_or_missing_features"
    if any(v is not None and (isinstance(v,bool) or not isinstance(v,(int,float))
        or v!=v or v<0 or v>1 or v in (float("inf"),float("-inf")))
        for v in features.values()):
        return None,"invalid_normalized_feature"
    coverage=features["evidence_coverage"]
    if coverage is None or coverage<MIN_COVERAGE:
        return None,"insufficient_evidence_coverage"
    # Actual coverage must correspond to non-null observed signals;
    # unknown != zero. Exclude summary coverage from the observed count.
    observed=sum(features[key] is not None for key in FEATURES if key!="evidence_coverage")
    if observed/9<MIN_COVERAGE:
        return None,"insufficient_feature_observation"
    try:
        snapshot=parse_utc(row["feature_snapshot_at"])
        action=parse_utc(row["action_recorded_at"])
        end=parse_utc(row["observation_window_end"])
        cutoff=parse_utc(cutoff)
        if not snapshot<action<end<=cutoff:
            return None,"feature_or_outcome_time_leakage"
        if end-action>timedelta(days=30) or action-snapshot>timedelta(days=90):
            return None,"invalid_observation_horizon"
        if row["observed_outcome"]=="completed":
            observed_at=parse_utc(row["outcome_recorded_at"])
            if not action<observed_at<=end:
                return None,"outcome_outside_observation_window"
        elif row["outcome_recorded_at"] is not None:
            return None,"false_outcome_must_have_null_event_time"
    except (TypeError,ValueError):
        return None,"invalid_timestamp_or_horizon"
    return {"group":row["synthetic_group"],"action":row["action_type"],
            "outcome":row["observed_outcome"],"month":action.strftime("%Y-%m")},None


def assess(rows,cutoff,minimum_test_support=MIN_HELDOUT_CLASS_SUPPORT):
    if not isinstance(rows,list) or len(rows)>20000:
        raise ValueError("bounded list of <=20000 synthetic records required")
    accepted=[]
    rejected=Counter()
    for row in rows:
        clean,reason=validate_observation(row,cutoff)
        if reason: rejected[reason]+=1
        else: accepted.append(clean)
    groups=sorted({x["group"] for x in accepted})
    rng=random.Random(42);rng.shuffle(groups)
    a=int(len(groups)*.7);b=int(len(groups)*.85)
    train,val,test=map(set,(groups[:a],groups[a:b],groups[b:]))
    assert train.isdisjoint(val) and train.isdisjoint(test) and val.isdisjoint(test)
    counts={name:dict(Counter(r["action"] for r in accepted if r["group"] in part))
            for name,part in (("train",train),("validation",val),("test",test))}
    support={action:counts["test"].get(action,0) for action in ACTIONS}
    weak=[name for name,n in support.items() if n<minimum_test_support]
    outcome_counts=dict(Counter(r["outcome"] for r in accepted))
    # For this milestone, production is ALWAYS blocked: even a perfect
    # synthetic dataset does not establish consented real-world validity.
    return {
        "research_only":True,
        "data_source":"strict_synthetic_mock_verified_history",
        "real_vendor_records_used":False,
        "production_training_enabled":False,
        "production_agent_actions_enabled":False,
        "accepted_synthetic_rows":len(accepted),
        "rejected_by_reason":dict(sorted(rejected.items())),
        "distinct_synthetic_businesses":len(groups),
        "business_disjoint_split_counts":{"train":len(train),"validation":len(val),"test":len(test)},
        "action_test_support":support,
        "under_supported_actions":weak,
        "outcome_state_counts":outcome_counts,
        "evaluation_ready_synthetic":bool(groups and not weak and all((train,val,test))),
        "real_world_promotion_gate":"BLOCKED_NO_REAL_LABELS_OR_APPROVED_CONSENT_PIPELINE",
        "label_meaning":"recorded completed/not-completed action only; NOT business growth, sales, revenue or treatment effect",
    }


def synthetic_rows(businesses=300,seed=42):
    if businesses<20 or businesses>5000:
        raise ValueError("synthetic business count must be 20..5000")
    rng=random.Random(seed)
    rows=[]
    for business in range(businesses):
        day=1+(business%20)
        action=ACTIONS[business%len(ACTIONS)]
        snapshot=f"2026-10-{day:02d}T00:00:00Z"
        event=f"2026-10-{day:02d}T12:00:00Z"
        outcome=f"2026-10-{day+1:02d}T12:00:00Z"
        end=f"2026-10-{day+2:02d}T12:00:00Z"
        features={key:round(rng.uniform(.1,.95),3) for key in FEATURES}
        features["evidence_coverage"]=1.0
        completed=(business%4!=0)
        rows.append({
          "synthetic_group":f"sim-{business:05d}","owner_scoped":True,
          "approved_listing":True,"consent_training_opt_in":True,
          "consent_not_revoked":True,"consent_active_at":True,
          "feature_version":FEATURE_VERSION,"features":features,
          "feature_snapshot_at":snapshot,"action_type":action,
          "action_recorded_at":event,"observation_window_end":end,
          "observation_window_complete":True,
          "observed_outcome":"completed" if completed else "not_completed",
          "outcome_recorded_at":outcome if completed else None,
          "source_provenance":PROVENANCE,"label_version":LABEL_VERSION,
        })
    return rows


if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--synthetic-businesses",type=int,default=500)
    p.add_argument("--seed",type=int,default=42)
    p.add_argument("--output",default="")
    args=p.parse_args()
    result=assess(synthetic_rows(args.synthetic_businesses,args.seed),
                 "2026-11-15T00:00:00Z")
    encoded=json.dumps(result,indent=2,sort_keys=True)
    if args.output:
        path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(encoded+"\n",encoding="utf8")
    print(encoded)
