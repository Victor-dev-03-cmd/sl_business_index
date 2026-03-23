-- ============================================
-- FIX QR INVENTORY POLICIES
-- ============================================

-- Allow vendors to update unassigned QR codes to link them to their own businesses
-- A vendor can only update a row if:
-- 1. The status is 'unassigned'
-- 2. They own the business they are linking it to
CREATE POLICY "Vendors can self-assign QR" ON public.qr_inventory
FOR UPDATE
USING (
    status = 'unassigned'
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = qr_inventory.business_id
        AND b.owner_id = auth.uid()
    )
);

-- Allow vendors to create their own QR codes if none are available
-- (This allows the system to work even if service role is not available)
CREATE POLICY "Vendors can create own QR" ON public.qr_inventory
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = qr_inventory.business_id
        AND b.owner_id = auth.uid()
    )
);

-- Allow vendors to view assigned QR codes for their own businesses
CREATE POLICY "Vendors can view own assigned QR" ON public.qr_inventory
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = qr_inventory.business_id
        AND b.owner_id = auth.uid()
    )
);
