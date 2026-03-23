-- ============================================
-- 1. DROP ALL EXISTING POLICIES FOR QR_INVENTORY
-- ============================================

DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'qr_inventory' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.qr_inventory', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- 2. RECREATE CONSOLIDATED POLICIES
-- ============================================

-- A. ADMIN & CEO: Full Control
CREATE POLICY "Admins manage all QR" ON public.qr_inventory
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);

-- B. VENDORS: Self-Assign existing QR
-- Vendors can update a QR if it's currently unassigned and they are linking it to their own business.
CREATE POLICY "Vendors self-assign QR" ON public.qr_inventory
FOR UPDATE USING (
    status = 'unassigned'
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = qr_inventory.business_id
        AND b.owner_id = auth.uid()
    )
);

-- C. VENDORS: Create new QR (Auto-Generation)
-- If no inventory is available, vendors can insert their own QR linked to their business.
CREATE POLICY "Vendors create own QR" ON public.qr_inventory
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = qr_inventory.business_id
        AND b.owner_id = auth.uid()
    )
);

-- D. VENDORS: View their own assigned QR
CREATE POLICY "Vendors view own QR" ON public.qr_inventory
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = qr_inventory.business_id
        AND b.owner_id = auth.uid()
    )
);

-- E. PUBLIC: Redirection access
-- Needed for the /q/[id] redirection logic to work for anyone.
CREATE POLICY "Public QR redirection view" ON public.qr_inventory
FOR SELECT USING (true);

-- ============================================
-- 3. PERMISSIONS
-- ============================================

-- Ensure authenticated users have the right to interact with the table.
GRANT ALL ON public.qr_inventory TO authenticated;
GRANT SELECT ON public.qr_inventory TO anon;
