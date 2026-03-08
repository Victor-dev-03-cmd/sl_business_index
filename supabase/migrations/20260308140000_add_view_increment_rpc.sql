-- Create function to increment business views
CREATE OR REPLACE FUNCTION public.increment_business_views(business_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.businesses
  SET views = COALESCE(views, 0) + 1
  WHERE id = business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.increment_business_views(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_business_views(UUID) TO anon;
