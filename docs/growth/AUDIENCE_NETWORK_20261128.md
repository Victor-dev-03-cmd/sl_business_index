# SLBI Audience Network — simplified owner-approved model (2026-11-28)

Supersedes the earlier global admin planning toggle. The owner requires direct subscriptions automatically available to the subscribed business, and separate admin review only for additional platform audiences.

| Workstream | Candidate |
|---|---|
| 1. Consent | Verified account email, explicit v2 address-sharing disclosure, independent business/platform opt-in and withdrawal, business owner binding |
| 2. Business profile | Follow/unfollow, news/push and email subscription controls; follow/review never grant email access |
| 3. News | Indexed follower-only queue, batch 250, dedupe, cancellation of queued push on withdrawal; official announcements unchanged |
| 4. Following Centre | Account menu entry, all business preferences, separate partner email-sharing consent, language |
| 5. My Subscribers | Owner/Pro-only automatic paginated direct email list, current verified address, ownership, consent and suppression checks; no admin review |
| 6. Extra SLBI audience | Vendor request for 1–100 consenting contacts with purpose/language, admin approve/reject/revoke, fixed allocation valid seven days, no global switch |
| 7. Email providers | Deferred until owner supplies two approved providers; no delivery active |

The direct email list is for the named business only. Platform sharing consent explicitly states that verified email can be shared with approved participating businesses for marketing. No registered-account pool export, no inferred consent, no automatic import from reviews, enquiries or follows. Staff never override consent. Approval snapshots recipient IDs and consent; email is resolved only at authorized read and removed on withdrawal, expiry, revocation, address or ownership change. Already copied addresses cannot be recalled; vendor usage obligations and privacy terms need review before release. No CSV export. Caps and expiry are initial safeguards, not owner-selected commercial terms. Language-only segmentation. Provider-stage double opt-in, delivery-time consent checks, unsubscribe, bounce/complaint handling, quota and analytics remain deferred.

Existing baseline: PR #239 deployed; production vendor news currently fans out to every profile. Candidate SQL is not applied. Existing FCM job remains unchanged; new worker activation and rollback SQL prepared. Earlier isolated fixture passed before the revised request model; all tests must rerun for exact new head. Previous head 16/17 passed; old V3 assertion corrected.

Release gates: exact-head CI; verify database backup/rollback and privacy/consent terms; apply audited migration and cron; verify ACL/RLS and worker; record actual migration; re-CI and merge; Vercel READY exact www alias; signed-in vendor A/B and user, admin, device notification acceptance. No production migration, email release or send performed.
