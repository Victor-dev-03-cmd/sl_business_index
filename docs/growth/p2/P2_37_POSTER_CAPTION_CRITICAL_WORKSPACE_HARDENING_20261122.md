# P2-37 — Poster Studio and Caption Lab critical hardening (2026-11-22)

Scope: existing internal-QA tools only. Keep global marketplace rollouts unchanged, existing plan/credit limits, providers, and all public-site layouts.

## Data protection and reliability
- Caption Generate/Save/Attach/Edit operations now share a synchronous lock. Each selected language retains an unresolved request UUID across retries and same-tab refresh; only a confirmed refund or successful response releases that key. Backend distinguishes refunded attempts from uncertain delivery.
- Planner save rejects >3,000 characters rather than truncating multilingual text; select separate languages or shorten before saving. Seven-key database brief remains unchanged.
- Caption saved AI edits use the existing authenticated PATCH endpoint with business scope and preserve three angles. Library loads older records in increments, capped at latest 200. Session recovery retains languages, goal, tone, hashtags and draft IDs.
- Poster output uses creative-input and composed-render signatures; stale/failed output cannot be exported or handed off. First completed real artwork auto-saves once per generation; edited and sample variants require explicit Save version / Retry save. Same owner/business/PNG bytes reuse deterministic private asset IDs. Never replace old linked assets.
- Blueprint cache includes format, campaign style and approved offer. Mic permission and pending transcript are locked during preparation/generation.
- Known export format travels through handoff and is inferred from known PNG aspect ratios on attachment; unknown ratios use existing Planner defaults. The three predefined Planner palette values cannot fully represent custom poster palettes.
- Caption output requires substantial selected-script text and continues to accept mixed-language brand terms. Keep manual review and no automatic publishing.

## Validation and remaining acceptance
Run Poster/Caption contracts, workspace safety regression tests, TypeScript and exact production deployment verification. Real Puter/Gemini generation, device microphone, upload/download at maximum byte sizes and signed-in end-to-end testing require separate QA (no paid generation triggered for this release). No schema or plan change. Outstanding cross-tab/distinct-file quota concurrency: storage count cap remains best-effort under concurrent distinct uploads; direct campaign attachment integrity is still constrained by existing tenant RLS and application validation rather than a new atomic DB asset registry. Do not enable global rollout until these release gates are satisfied.
