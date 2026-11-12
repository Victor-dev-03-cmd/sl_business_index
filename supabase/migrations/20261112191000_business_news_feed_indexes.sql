-- Newspaper edition: recent stories and joins to verified business publishers.
-- These are additive btree indexes; no existing data or constraints are changed.
CREATE INDEX IF NOT EXISTS business_news_created_at_desc_idx
  ON public.business_news (created_at DESC);
CREATE INDEX IF NOT EXISTS business_news_business_id_idx
  ON public.business_news (business_id);
CREATE INDEX IF NOT EXISTS business_news_owner_id_idx
  ON public.business_news (owner_id);
