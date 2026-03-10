-- Sync featured_listings table with businesses table boolean
-- This ensures any businesses marked as featured before the admin page fix are now in the correct table
INSERT INTO public.featured_listings (business_id)
SELECT id FROM public.businesses 
WHERE is_featured = true 
AND status = 'approved'
ON CONFLICT (business_id) DO NOTHING;

-- Also remove any from featured_listings that are no longer marked as featured in businesses (optional, but keeps sync)
DELETE FROM public.featured_listings
WHERE business_id IN (
    SELECT id FROM public.businesses WHERE is_featured = false
);
