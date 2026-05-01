-- Add verification_status to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'approved', 'rejected'));

-- Update handle_verification_approval to sync verification_status on businesses table
CREATE OR REPLACE FUNCTION public.handle_verification_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle Inserts
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.businesses 
        SET verification_status = NEW.status
        WHERE id = NEW.business_id;
    END IF;

    -- Handle Updates
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.status != OLD.status) THEN
            -- Update the business verification status
            UPDATE public.businesses 
            SET 
                is_verified = (CASE WHEN NEW.status = 'approved' THEN true ELSE false END),
                verification_status = NEW.status
            WHERE id = NEW.business_id;

            -- Notify owner
            IF (NEW.status = 'approved') THEN
                INSERT INTO public.notifications (user_id, title, message, type)
                SELECT 
                    owner_id, 
                    'Business Verified! ✅', 
                    'Congratulations! Your business has been verified and awarded a blue badge.', 
                    'success'
                FROM public.businesses 
                WHERE id = NEW.business_id;
            ELSIF (NEW.status = 'rejected') THEN
                INSERT INTO public.notifications (user_id, title, message, type)
                SELECT 
                    owner_id, 
                    'Verification Rejected', 
                    'Unfortunately, your business verification request was not approved. Please check your documents and try again.', 
                    'error'
                FROM public.businesses 
                WHERE id = NEW.business_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger to handle both insert and update
DROP TRIGGER IF EXISTS on_verification_approval ON public.verifications;
CREATE TRIGGER on_verification_approval
    AFTER INSERT OR UPDATE OF status ON public.verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_verification_approval();

-- Ensure is_verified and verification_status are synced for existing verifications
UPDATE public.businesses b
SET 
    is_verified = true,
    verification_status = 'approved'
FROM public.verifications v
WHERE v.business_id = b.id AND v.status = 'approved';

UPDATE public.businesses b
SET 
    verification_status = v.status
FROM public.verifications v
WHERE v.business_id = b.id AND v.status IN ('pending', 'rejected');
