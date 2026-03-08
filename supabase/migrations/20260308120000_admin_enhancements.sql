-- ============================================
-- ADMIN ENHANCEMENTS & VERIFICATION LOGIC
-- ============================================

-- 1. Add Verification Status to Businesses
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Add Admin Specific RLS Policies
-- Admin can do anything
CREATE POLICY "Admins can manage everything" ON public.profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);

CREATE POLICY "Admins can manage all businesses" ON public.businesses FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);

CREATE POLICY "Admins can manage all verifications" ON public.verifications FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ceo'))
);

-- 3. Trigger for Business Approval Notifications
CREATE OR REPLACE FUNCTION public.handle_business_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status != NEW.status) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.owner_id,
            'Business Status Updated',
            'Your business "' || NEW.name || '" has been ' || NEW.status || '.',
            CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'error' END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_business_status_change
    AFTER UPDATE OF status ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_business_status_change();

-- 4. Trigger for Verification Approval
CREATE OR REPLACE FUNCTION public.handle_verification_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'approved' AND OLD.status != 'approved') THEN
        -- Update the business to is_verified = true
        UPDATE public.businesses 
        SET is_verified = true 
        WHERE id = NEW.business_id;

        -- Notify owner
        INSERT INTO public.notifications (user_id, title, message, type)
        SELECT 
            owner_id, 
            'Business Verified!', 
            'Congratulations! Your business has been verified and awarded a badge.', 
            'success'
        FROM public.businesses 
        WHERE id = NEW.business_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_verification_approval
    AFTER UPDATE OF status ON public.verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_verification_approval();
