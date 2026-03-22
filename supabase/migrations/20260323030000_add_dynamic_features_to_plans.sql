-- Add functional_features (jsonb) to store dynamic toggles
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS functional_features JSONB DEFAULT '{}';

-- Add feature_definitions (jsonb) to store labels for functional toggles
-- We can store this as a global setting or on the plans themselves
-- For now, let's add a global_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- Initialize functional feature definitions
INSERT INTO public.app_settings (key, value)
VALUES ('advanced_feature_definitions', '[
    {"id": "show_verified_badge", "label": "Verified Badge"},
    {"id": "priority_support", "label": "Priority Support"},
    {"id": "advanced_analytics", "label": "Advanced Analytics"},
    {"id": "has_social_sharing", "label": "Social Sharing"},
    {"id": "featured_boost", "label": "Featured Listing Boost"},
    {"id": "advanced_feature_access", "label": "Advanced Feature Access"}
]')
ON CONFLICT (key) DO NOTHING;
