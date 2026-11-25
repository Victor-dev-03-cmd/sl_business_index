#!/usr/bin/env python3
"""Synthetic-only NeuroGrowth ML-03 experiment. No live vendor data or DB access."""
import json, argparse
from pathlib import Path
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score, f1_score

ACTIONS=("improve_listing","followup_leads","reply_reviews","improve_contact","prepare_campaign")
FEATURES=("listing_gaps","unanswered_lead_ratio","overdue_reminder_ratio","unanswered_review_ratio","recent_views_norm","call_click_rate","recent_enquiries_norm","campaign_staleness","business_age_norm","evidence_coverage")

def synthetic_panel(businesses=600, seed=42):
    if businesses < 100: raise ValueError("minimum 100 synthetic businesses")
    rng=np.random.default_rng(seed)
    rows=[]; labels=[]; ids=[]; periods=[]
    for bid in range(businesses):
        base=rng.beta(1.8,2.2,10)
        for month in range(1,10):
            x=np.clip(base+rng.normal(0,.095,10)+(month-5)*.008,0,1)
            x[5]*=.35
            x[9]=rng.uniform(.75,1)
            gap,lead,due,review,views,calls,enquiries,stale,age,cov=x
            utility=np.array([1.5*gap+.25*age,1.2*lead+1.5*due+.8*lead*enquiries,1.9*review+.5*review*views,1.35*views*(1-calls)+.25*(1-cov),1.3*stale+.55*views*(1-enquiries)+.18*age])
            label=int((utility+rng.normal(0,.16,5)).argmax())
            rows.append(x);labels.append(label);ids.append(bid);periods.append(month)
    return np.asarray(rows,dtype=np.float32),np.asarray(labels),np.asarray(ids),np.asarray(periods)

def split(ids,periods,seed=42):
    rng=np.random.default_rng(seed); order=rng.permutation(np.unique(ids)); n=len(order)
    a,b,c=order[:int(.70*n)],order[int(.70*n):int(.85*n)],order[int(.85*n):]
    train=np.isin(ids,a)&(periods<=6)
    val=np.isin(ids,b)&(periods==7)
    test=np.isin(ids,c)&(periods>=8)
    assert all(z.any() for z in (train,val,test))
    assert not(set(ids[train])&set(ids[val]) or set(ids[train])&set(ids[test]) or set(ids[val])&set(ids[test]))
    assert periods[train].max()<periods[val].min()<periods[test].min()
    return train,val,test

def rule(x):
    return np.column_stack([1.5*x[:,0],1.2*x[:,1]+1.4*x[:,2],1.8*x[:,3],1.2*x[:,4]*(1-x[:,5]),1.2*x[:,7]]).argmax(axis=1)

def metrics(y,p):
    return dict(accuracy=round(float(accuracy_score(y,p)),4),macro_f1=round(float(f1_score(y,p,labels=range(5),average="macro",zero_division=0)),4),recall_by_action={name:round(float(np.sum((p==i)&(y==i))/max(1,np.sum(y==i))),4) for i,name in enumerate(ACTIONS)})

def run(businesses=600,seed=42):
    x,y,ids,periods=synthetic_panel(businesses,seed)
    tr,va,te=split(ids,periods,seed)
    majority=int(np.bincount(y[tr],minlength=5).argmax())
    tree=HistGradientBoostingClassifier(max_iter=75,max_leaf_nodes=12,l2_regularization=2.0,learning_rate=.06,random_state=seed)
    tree.fit(x[tr],y[tr])
    return dict(research_only=True,data_type="fully_synthetic_monthly_simulation",real_business_validation=False,real_growth_or_roi_claim=None,seed=seed,train_rows=int(tr.sum()),validation_rows=int(va.sum()),test_rows=int(te.sum()),train_businesses=len(set(ids[tr])),validation_businesses=len(set(ids[va])),test_businesses=len(set(ids[te])),time_windows=dict(train="months 1-6",validation="month 7",test="months 8-9"),models=dict(majority=metrics(y[te],np.full(te.sum(),majority)),heuristic_rule=metrics(y[te],rule(x[te])),hist_gradient_boosting=metrics(y[te],tree.predict(x[te]))),caution="Simulated labels, no causal or real-vendor growth evidence.")

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--businesses",type=int,default=600);p.add_argument("--seed",type=int,default=42);p.add_argument("--output",default="");a=p.parse_args()
    result=json.dumps(run(a.businesses,a.seed),indent=2,sort_keys=True)
    if a.output:
        target=Path(a.output);target.parent.mkdir(parents=True,exist_ok=True);target.write_text(result+"\n")
    print(result)
