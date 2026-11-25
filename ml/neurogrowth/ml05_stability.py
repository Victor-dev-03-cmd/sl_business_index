#!/usr/bin/env python3
"""ML-05: SYNTHETIC ONLY. Business-level uncertainty and multi-seed stability."""
import argparse, json
from pathlib import Path
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from ml03_evaluate import ACTIONS, metrics, rule, split, synthetic_panel
from ml04_neural_benchmark import fit_network, logits_for, probabilities, rank_metrics

DATASET_SEEDS=(11,42,73)
MODEL_SEEDS=(7,42)
ARCHITECTURES=("small_mlp","residual_mlp")
ACTION_SUPPORT_WARNING=10
ABSTAIN_THRESHOLD=.70

def bootstrap_by_business(y,nn,tree,rules,business_ids,resamples=400,seed=42):
    """Paired cluster bootstrap: retain BOTH test months for each resampled business."""
    if resamples<20: raise ValueError("at least 20 resamples")
    y,nn,tree,rules,business_ids=map(np.asarray,(y,nn,tree,rules,business_ids))
    if len(set(map(len,(y,nn,tree,rules,business_ids))))!=1:
        raise ValueError("unmatched label, predictions or business ID lengths")
    unique=np.unique(business_ids)
    if len(unique)<10: raise ValueError("need at least ten test businesses")
    groups={int(b):np.flatnonzero(business_ids==b) for b in unique}
    rng=np.random.default_rng(seed)
    samples={key:[] for key in ("neural_accuracy","neural_macro_f1","delta_accuracy_vs_tree",
        "delta_macro_f1_vs_tree","delta_accuracy_vs_rules","delta_macro_f1_vs_rules")}
    for _ in range(resamples):
        picked=rng.choice(unique,size=len(unique),replace=True)
        ind=np.concatenate([groups[int(b)] for b in picked])
        a=metrics(y[ind],nn[ind])
        b=metrics(y[ind],tree[ind])
        c=metrics(y[ind],rules[ind])
        samples["neural_accuracy"].append(a["accuracy"])
        samples["neural_macro_f1"].append(a["macro_f1"])
        samples["delta_accuracy_vs_tree"].append(a["accuracy"]-b["accuracy"])
        samples["delta_macro_f1_vs_tree"].append(a["macro_f1"]-b["macro_f1"])
        samples["delta_accuracy_vs_rules"].append(a["accuracy"]-c["accuracy"])
        samples["delta_macro_f1_vs_rules"].append(a["macro_f1"]-c["macro_f1"])
    return {key:{"lower_95":round(float(np.quantile(vals,.025)),4),
                 "upper_95":round(float(np.quantile(vals,.975)),4)}
            for key,vals in samples.items()}

def test_scenario(dataset_seed=42,businesses=600,epochs=55,model_seeds=MODEL_SEEDS,
                  bootstrap_resamples=400):
    x,y,ids,months=synthetic_panel(businesses,dataset_seed)
    tr,va,te=split(ids,months,dataset_seed)
    assert set(ids[tr]).isdisjoint(ids[va]) and set(ids[tr]).isdisjoint(ids[te]) and set(ids[va]).isdisjoint(ids[te])
    assert months[tr].max()<months[va].min()<months[te].min()
    majority=int(np.bincount(y[tr],minlength=len(ACTIONS)).argmax())
    tree=HistGradientBoostingClassifier(max_iter=75,max_leaf_nodes=12,l2_regularization=2.,
                                        learning_rate=.06,random_state=dataset_seed)
    tree.fit(x[tr],y[tr])
    baseline_preds={"majority":np.full(int(te.sum()),majority,dtype=int),
                    "fixed_heuristic":rule(x[te]),"hist_gradient_boosting":tree.predict(x[te])}
    baselines={name:metrics(y[te],pred) for name,pred in baseline_preds.items()}
    candidates=[]
    for arch in ARCHITECTURES:
        for mseed in model_seeds:
            net,record=fit_network(x,y,tr,va,arch,mseed,epochs)
            candidates.append((record,net))
    # Model selection depends on validation exclusively: do NOT inspect test outcomes.
    champion,net=max(candidates,key=lambda p:(p[0]["validation_macro_f1"],
                p[0]["validation_accuracy"],-p[0]["seed"]))
    logits=logits_for(net,x[te])
    selected_metrics=rank_metrics(y[te],logits,champion["validation_fitted_temperature"])
    pred=probabilities(logits,champion["validation_fitted_temperature"]).argmax(axis=1)
    support={name:int((y[te]==i).sum()) for i,name in enumerate(ACTIONS)}
    warnings=[f"LOW_CLASS_SUPPORT {name} {n}" for name,n in support.items()
              if n<ACTION_SUPPORT_WARNING]
    warnings += [f"LOW_RECALL {name} {val:.4f}"
                 for name,val in selected_metrics["recall_by_action"].items() if val<.6]
    interval=bootstrap_by_business(y[te],pred,baseline_preds["hist_gradient_boosting"],
        baseline_preds["fixed_heuristic"],ids[te],bootstrap_resamples,dataset_seed+1000)
    return {"dataset_seed":dataset_seed,"businesses_generated":businesses,
            "train_businesses":len(set(ids[tr])),"validation_businesses":len(set(ids[va])),
            "test_businesses":len(set(ids[te])),"test_rows":int(te.sum()),
            "test_class_support":support,"baselines":baselines,
            "candidate_validation":[{"architecture":rec["architecture"],"model_seed":rec["seed"],
                "validation_macro_f1":rec["validation_macro_f1"],
                "validation_accuracy":rec["validation_accuracy"]} for rec,_ in candidates],
            "validation_selected":{"architecture":champion["architecture"],
                "model_seed":champion["seed"],"validation_macro_f1":champion["validation_macro_f1"],
                "test_metrics":selected_metrics},
            "paired_cluster_bootstrap_95_intervals":interval,"quality_warnings":warnings}

def run(dataset_seeds=DATASET_SEEDS,businesses=600,epochs=55,model_seeds=MODEL_SEEDS,
        bootstrap_resamples=400):
    if len(dataset_seeds)<2 or len(set(dataset_seeds))!=len(dataset_seeds):
        raise ValueError("need >=2 different synthetic dataset seeds")
    scenarios=[test_scenario(seed,businesses,epochs,model_seeds,bootstrap_resamples)
               for seed in dataset_seeds]
    def across(field):
        values=np.array([s["validation_selected"]["test_metrics"][field] for s in scenarios])
        return {"mean":round(float(values.mean()),4),"min":round(float(values.min()),4),
                "max":round(float(values.max()),4),"std_population":round(float(values.std(ddof=0)),4)}
    return {"research_only":True,"data_type":"fully_synthetic_monthly_simulation",
            "real_business_validation":False,"business_roi_or_causal_lift":None,
            "dataset_seeds":list(dataset_seeds),"model_seeds":list(model_seeds),
            "model_selection":"validation_only_per_dataset_never_by_test",
            "test_split":"business_disjoint_forward_time_months8_to9",
            "bootstrap_unit":"unseen_test_business_cluster_all_months",
            "bootstrap_resamples":bootstrap_resamples,
            "abstention_confidence_threshold":ABSTAIN_THRESHOLD,
            "summary_selected_neural_test_accuracy":across("accuracy"),
            "summary_selected_neural_test_macro_f1":across("macro_f1"),
            "scenarios":scenarios,"production_promotion_permitted":False,
            "limitation":"Simulated utility-family labels only. Intervals do NOT validate real vendors. No PII/DB export."}

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--dataset-seeds",type=int,nargs="+",default=list(DATASET_SEEDS))
    p.add_argument("--businesses",type=int,default=600)
    p.add_argument("--epochs",type=int,default=55)
    p.add_argument("--bootstrap-resamples",type=int,default=400)
    p.add_argument("--output",default="")
    a=p.parse_args()
    result=json.dumps(run(tuple(a.dataset_seeds),a.businesses,a.epochs,MODEL_SEEDS,a.bootstrap_resamples),
                      indent=2,sort_keys=True)
    if a.output:
        path=Path(a.output);path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(result+"\n",encoding="utf8")
    print(result)
