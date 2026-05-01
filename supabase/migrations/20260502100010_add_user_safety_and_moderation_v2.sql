-- 1. Update businesses status enum check to include 'suspended'
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_status_check;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));

-- 2. Create Reports Table (Drop if exists for clean retry)
DROP TABLE IF EXISTS public.reports;
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('news', 'business')),
    target_name TEXT,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS on Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Reports
CREATE POLICY "Users can view their own reports" ON public.reports
    FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all reports" ON public.reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'ceo')
        )
    );

-- 5. Trigger to handle auto-unverify on multiple reports (threshold: 5 reports)
CREATE OR REPLACE FUNCTION public.handle_auto_moderation()
RETURNS TRIGGER AS $$
DECLARE
    report_count INTEGER;
BEGIN
    IF (NEW.target_type = 'business') THEN
        SELECT count(*) INTO report_count FROM public.reports WHERE target_id = NEW.target_id AND status = 'pending';
        
        IF (report_count >= 5) THEN
            UPDATE public.businesses 
            SET is_verified = false, verification_status = 'rejected'
            WHERE id = NEW.target_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_report_auto_mod ON public.reports;
CREATE TRIGGER on_new_report_auto_mod
    AFTER INSERT ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auto_moderation();

-- 6. Add updated_at trigger for reports
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_reports_updated_at ON public.reports;
CREATE TRIGGER set_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 7. Grant Permissions
GRANT ALL ON TABLE public.reports TO authenticated;
GRANT ALL ON TABLE public.reports TO service_role;
