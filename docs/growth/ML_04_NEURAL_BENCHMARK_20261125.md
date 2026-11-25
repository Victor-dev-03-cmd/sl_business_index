# NeuroGrowth ML-04 — Same-panel Neural Benchmark (2026-11-25)

## Decision and actual evidence
User requested **immediate next ML stage, training completion and accuracy verification**. ML-03 PR #191 has merged main at `9b2525efd4ba95733aef28e0f11733a56108d21e` after exact PR-head **6/6 GitHub check runs and 6/6 workflows PASS**. ML-04 begins on that merged main. This phase is RESEARCH ONLY, does not change SLBI vendor UI or deploy an agent.

Deepnote workspace: `SLBI`, project `2d7d3e23-f87e-437f-a091-28edaa42ad49`. Actual Deepnote notebook `NeuroGrowth ML-04 — Neural Network Accuracy Benchmark` id `feaaba272e36462f85b3faa1ff677dc9`, URL:
https://deepnote.com/workspace/slbi-3adf8d1d-5feb-4e26-8560-c517fd6cbfaa/project/NeuroGrowth-ML-02-SLBI-Growth-Engine-2d7d3e23-f87e-437f-a091-28edaa42ad49/notebook/NeuroGrowth-ML-04-Neural-Network-Accuracy-Benchmark-feaaba272e36462f85b3faa1ff677dc9?utm_content=2d7d3e23-f87e-437f-a091-28edaa42ad49

**REAL DEEPNOTE RUN OF FULLY SYNTHETIC DATA** `5ad6680c-9aa5-41fa-813e-b18f944c0eb3`: SUCCESS, completed 2026-11-25T12:52:29.059Z. CPU Basic (no GPU), Python3.13.18, PyTorch2.12.0+cu130 CUDA=FALSE, NumPy2.4.6, sklearn1.6.1. All 4 Python unit tests PASS. Saved metrics JSON checksum SHA-256 `1dfe35893ec73681fac55e93822d2a25c28b821d6357528c78757f8ffc43cab0`.

## Identical dataset / leak-resistant evaluation
`ml/neurogrowth/ml04_neural_benchmark.py` uses unchanged `ml03_evaluate.synthetic_panel` and `ml03_evaluate.split`: 600 SIMULATED businesses ×9 simulated months; train 420 business IDs (2520 rows months 1–6), validation 90 disjoint business IDs (90 rows month 7), held-out test 90 other business IDs (180 rows months 8–9). Feature matrix is the same for all models. **No actual vendor ground truth**. Train majority, fixed hand-coded heuristic and HistGradientBoosting. Train two PyTorch options `SmallMLP` and `ResidualTabularMLP`, each seeds 7 and 42, using training only, validation-selected early stopping and validation-only temperature. Selection among neural experiments uses **validation Macro-F1** (tie validation accuracy) rather than selecting the best test score. Track Top3, per-class recall, ECE, simulated softmax >0.70 coverage and selective accuracy; softmax is NOT probability of sales or growth.

## Verified held-out synthetic results
| Candidate | Test accuracy | Test Macro-F1 | Notes |
|---|---:|---:|---|
| Majority | 0.6167 | 0.1526 | trivially predicts most common synthetic class |
| Fixed heuristic | 0.8500 | 0.6917 | simple synthetic signal rule |
| HistGradientBoosting | 0.8611 | 0.6750 | improve_contact recall 0.20 |
| SmallMLP seed 7 | 0.9056 | 0.8082 | **exploratory highest test**, NOT validation-selected |
| SmallMLP seed 42 | 0.8778 | 0.7831 | **validation-selected** model; best val macro-F1 .7507 |
| ResidualMLP seed 7 | 0.8667 | 0.7781 | 2nd architecture |
| ResidualMLP seed 42 | 0.8778 | 0.7756 | 2nd architecture |

Selected SmallMLP seed 42 recall: improve_listing .8667; followup_leads .9009; reply_reviews .9615; improve_contact .6000; prepare_campaign .7391. Top-3 observed synthetic action hit rate 1.0000; selected probability-threshold coverage .7778, selective accuracy .9571, top-label ECE .0751. All are simulator classification metrics; NO real business growth claims. Only 90 test businesses and two seeds; data constructed from fixed utility rules; conclusions may not generalize. The 90.56% seed7 run is not cherry-picked as the selected deployment model. **No model is approved for production inference**.

## Files and safeguards
- `ml/neurogrowth/ml04_neural_benchmark.py` PyTorch training + controlled comparable rules and boosted trees.
- `ml/neurogrowth/tests/test_ml04_benchmark.py` four actual CPU tests.
- `ml/neurogrowth/contracts/ml04_model_selection.json` privacy/selection contract.
- `ml/neurogrowth/experiment_20261125_ml04_synthetic_metrics.json` verified aggregate-only Deepnote receipt; no weights, records or PII.
- `tests/ml/neurogrowth-ml04-contract.test.mjs` Node static safety and validation-selection contract tests.
- `.github/workflows/neurogrowth-ml04.yml` CI source/privacy checks WITHOUT downloading PyTorch. Real training and accuracy actually validated in connected Deepnote, separate from GitHub static CI.
- No production DB read/write, Supabase/Neon credentials, customer PII export, paid GPU, action executor, outbound communication, billing, RLS/schema changes, Vercel feature deployment.
- Existing vendor private context and explicit action authorization roadmap unchanged. Shared model weights; tenant-owned per-request RLS data only when later authorized.

## Next research gates
1. ML-05: validate seed stability on multiple **different synthetic data-generation seeds**, compare neural models against rules+trees with uncertainty intervals by business, class imbalance and evidence coverage; stop training-only score optimization when real labels are needed. Add business-outcome label definitions that are observable and consented, avoiding causal claims.
2. Real aggregation requires separate owner-approved retention, consent, PII-minimization, tenant isolation and RLS review, no raw customer data into Deepnote or GitHub.
3. After legitimate real held-out validation, read-only/shadow rollout, feedback and opt-in. Multilingual LLM/planner distinct from numeric action ranker; mutating tools deny-default and vendor per-action exact authorization, audit + replay protection.
4. On this PR require exact FINAL HEAD workflows/jobs all green; merge only after green, verify main and Vercel production if triggered, append verified receipt. Keep docs/growth/HANDOFF_LATEST.md updated in SAME PR.

## COMPLETE NEXT-CHAT COPY/PASTE PROMPT
Continue SLBusinessIndex GrowthOS in Tamil. First FULLY read main `docs/growth/HANDOFF_LATEST.md`, `docs/growth/ML_04_NEURAL_BENCHMARK_20261125.md`, `docs/growth/ML_03_BUSINESS_TIME_BASELINES_20261125.md` and `AGENTS.md`; repo Victor-dev-03-cmd/sl_business_index, website https://www.slbusinessindex.com. Owner's highest priority is proprietary NeuroGrowth Growth Engine with per-vendor private authorized AI agent, not generic SEO; secure user/business RLS context, separate multilingual planner, and vendor confirmation before each mutating action. ML-03 PR #191 squash merged main SHA 9b2525efd4ba95733aef28e0f11733a56108d21e after final 6/6 checks and workflows PASS. ML-04 research branch research/neurogrowth-ml04-neural-benchmark-20261125 with PyTorch SmallMLP and ResidualTabularMLP seeds7/42, validation-only early stopping/temperature, same ML-03 synthetic panel business/time split. Actual Deepnote SLBI workspace project 2d7d3e23-f87e-437f-a091-28edaa42ad49 notebook feaaba272e36462f85b3faa1ff677dc9 run 5ad6680c-9aa5-41fa-813e-b18f944c0eb3 SUCCESS, 4/4 Python tests PASS. Synthetic test 180 rows/90 unseen businesses: majority acc .6167 F1 .1526, fixed rules .8500 F1 .6917, HistGradientBoosting .8611 F1 .6750, SmallMLP seed7 exploratory .9056 F1 .8082, SmallMLP seed42 **VALIDATION-SELECTED** .8778 F1 .7831, ResidualMLP seed7 .8667 F1 .7781, ResidualMLP seed42 .8778 F1 .7756. Selected recall improve_contact .6, Top3 1.0, confidence >=.70 coverage .7778, selective accuracy .9571, ECE .0751, all SIMULATED ONLY; no real sales or growth validation, no production model. Accuracy **do not** compare to old ML-01 80% because different dataset. Verify ML-04 PR exact-head all CI green; squash merge only then; verify main/Vercel READY if triggered and write actual PR release receipt. Every Github change same PR HANDOFF_LATEST with full prompt. After ML-04 move ML-05: multi-dataset-seed robustness, class imbalance, business-bootstrap uncertainty, legit consented business outcome labels, matched strong baselines, no raw PII or private DB export or billable GPU. Separate agent secure tool and multilingual planning from numeric network. Do NOT authorize arbitrary dashboard actions, auto-send messages, delete/payments or real SQL without explicit scoped new approval. No false guaranteed superhuman growth claims.
