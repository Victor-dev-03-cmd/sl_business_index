-- SLBI vendor studios: review-only data access strengthening.
-- NOT applied to production; requires isolated Supabase branch regression.
-- Legacy QR inventory, admin QR assignment and promotions are already live.
begin;

-- Existing production data currently has no duplicate assigned QR per business
-- (read-only check 2026-11-11). Confirm again before applying this index.
create unique index if not exists qr_one_assigned_per_business
on public.qr_inventory (business_id)
where status='assigned' and business_id is not null;

-- Mark media upload storage as public because social creatives intentionally
-- need public links, but keep a strict size/type limit on future objects.
update storage.buckets
set file_size_limit=8388608,
    allowed_mime_types=array['image/jpeg','image/png','image/webp']::text[]
where id='promotions';

-- Existing policy permits vendor_id match even when business_id belongs to
-- another owner. Tighten the WITH CHECK and USING tenant boundary.
drop policy if exists "Vendors manage own promotions" on public.promotions;
create policy "Vendors manage own promotions" on public.promotions
for all to authenticated
using (
  vendor_id=(select auth.uid()) and exists(
    select 1 from public.businesses b
    where b.id=promotions.business_id and b.owner_id=(select auth.uid())
  )
)
with check (
  vendor_id=(select auth.uid()) and exists(
    select 1 from public.businesses b
    where b.id=promotions.business_id and b.owner_id=(select auth.uid())
  )
);

-- Existing vendor QR INSERT RLS already verifies ownership, but does not
-- enforce an approved listing; the new request endpoint does both.
drop policy if exists "Vendors create own QR" on public.qr_inventory;
create policy "Vendors create own QR" on public.qr_inventory
for insert to authenticated
with check (
  status='assigned' and exists(
    select 1 from public.businesses b
    where b.id=qr_inventory.business_id
      and b.owner_id=(select auth.uid()) and b.status='approved'
  )
);

-- Current "Vendors self-assign QR" UPDATE policy is a separate legacy
-- workflow and remains unchanged until its admin/mobile compatibility has
-- been audited. Preventing serial mutation needs column grant review.
commit;

-- STAGING TEST MATRIX:
-- [ ] Owner can upload 8MB-max JPG/PNG/WebP to promotions storage.
-- [ ] Larger and unsupported MIME uploads are rejected.
-- [ ] Owner A cannot INSERT a promotion pointing to business B.
-- [ ] Owner A cannot UPDATE existing promo to business B.
-- [ ] Admin can continue reviewing/approving/rejecting promotions.
-- [ ] Existing promotion history still loads and public images still render.
-- [ ] Owner can request managed QR for approved listing via SSR cookie auth.
-- [ ] Duplicate concurrent QR requests yield one assigned serial (index).
-- [ ] Pending/rejected/non-owned listing cannot acquire assigned QR.
-- [ ] Old admin QR inventory and QR redirect endpoints continue to work.
-- [ ] Check existing self-assign QR workflow before revoking its UPDATE policy.
