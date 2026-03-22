-- ============================================
-- 1. ENUMS & TYPES
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.qr_status AS ENUM ('unassigned', 'assigned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. TABLES
-- ============================================

-- QR INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.qr_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_id TEXT UNIQUE NOT NULL,
    short_link TEXT NOT NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    status public.qr_status DEFAULT 'unassigned',
    batch_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. INDEXES & RLS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_qr_inventory_serial_id ON public.qr_inventory(serial_id);
CREATE INDEX IF NOT EXISTS idx_qr_inventory_business_id ON public.qr_inventory(business_id);

ALTER TABLE public.qr_inventory ENABLE ROW LEVEL SECURITY;

-- QR Inventory Policies
CREATE POLICY "QR viewable by admins" ON public.qr_inventory FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);

CREATE POLICY "QR insertable by admins" ON public.qr_inventory FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);

CREATE POLICY "QR updatable by admins" ON public.qr_inventory FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);

-- Public access to individual QR data for redirection
CREATE POLICY "Public QR view for redirection" ON public.qr_inventory FOR SELECT USING (true);

-- Enable Realtime for QR Inventory
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_inventory;
