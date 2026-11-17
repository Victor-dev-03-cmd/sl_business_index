-- P2-29: Persist only a validated server-owned image UUID next to each
-- Campaign Planner draft. The strict seven-field brief shape is intentionally
-- unchanged, so existing planner consumers and RLS remain compatible.
ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS poster_asset_id uuid;
COMMENT ON COLUMN public.marketing_campaigns.poster_asset_id
  IS 'Optional UUID of an owner-scoped PNG in private bucket slbi-poster-ai-private; a verified server route resolves owner/business prefix. This is not a public URL.';
CREATE INDEX IF NOT EXISTS marketing_campaigns_poster_asset_id_idx
  ON public.marketing_campaigns (poster_asset_id)
  WHERE poster_asset_id IS NOT NULL;
