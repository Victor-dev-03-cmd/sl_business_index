-- Add advanced_feature_access to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS advanced_feature_access BOOLEAN DEFAULT false;

-- Update existing Enterprise plan to have it enabled
UPDATE public.subscription_plans 
SET advanced_feature_access = true 
WHERE name = 'Enterprise';
