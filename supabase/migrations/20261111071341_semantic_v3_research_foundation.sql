-- SLBI SemanticSearch v3 — evaluation and private vector foundation.
-- Additive schema only; no auto activation and no unverified embeddings.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS slbi_search_internal;
REVOKE ALL ON SCHEMA slbi_search_internal FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS slbi_search_internal.business_embeddings (
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL CHECK (length(model_id) BETWEEN 3 AND 120),
  content_sha256 TEXT NOT NULL CHECK (length(content_sha256) = 64),
  embedding extensions.vector(384) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, model_id)
);
ALTER TABLE slbi_search_internal.business_embeddings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON slbi_search_internal.business_embeddings FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA slbi_search_internal TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON slbi_search_internal.business_embeddings TO service_role;
-- 22 business listings do not justify an approximate ANN index yet.
-- No public vector RPC until a cross-lingual model + evaluation is verified.

CREATE TABLE IF NOT EXISTS public.search_evaluation_cases (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  query_text TEXT NOT NULL CHECK (length(query_text) BETWEEN 2 AND 160),
  language TEXT NOT NULL CHECK (language IN ('en','ta','si','ta-Latn','si-Latn','mixed')),
  expected_intent TEXT NOT NULL,
  expected_category TEXT,
  expected_location TEXT,
  label_source TEXT NOT NULL DEFAULT 'curated_dictionary',
  validation_status TEXT NOT NULL DEFAULT 'awaiting_native_review'
    CHECK (validation_status IN ('awaiting_native_review','reviewed','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (query_text,language,expected_intent)
);
ALTER TABLE public.search_evaluation_cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.search_evaluation_cases FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.search_evaluation_cases TO authenticated;
CREATE POLICY "admin_read_search_eval_cases"
ON public.search_evaluation_cases FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles AS p
  WHERE p.id=(SELECT auth.uid()) AND lower(p.role::text) IN ('admin','ceo')
));

CREATE TABLE IF NOT EXISTS public.search_relevance_reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_id BIGINT NOT NULL REFERENCES public.search_evaluation_cases(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  relevance SMALLINT NOT NULL CHECK (relevance BETWEEN 0 AND 3),
  reviewer_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id,business_id,reviewer_id)
);
ALTER TABLE public.search_relevance_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.search_relevance_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON public.search_relevance_reviews TO authenticated;
CREATE POLICY "admin_read_search_relevance_reviews"
ON public.search_relevance_reviews FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id=(SELECT auth.uid()) AND lower(p.role::text) IN ('admin','ceo')
));
CREATE POLICY "admin_insert_search_relevance_reviews"
ON public.search_relevance_reviews FOR INSERT TO authenticated
WITH CHECK (
  reviewer_id=(SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id=(SELECT auth.uid()) AND lower(p.role::text) IN ('admin','ceo'))
);
CREATE POLICY "admin_update_search_relevance_reviews"
ON public.search_relevance_reviews FOR UPDATE TO authenticated
USING (
  reviewer_id=(SELECT auth.uid()) AND
  EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id=(SELECT auth.uid()) AND lower(p.role::text) IN ('admin','ceo'))
)
WITH CHECK (
  reviewer_id=(SELECT auth.uid()) AND
  EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id=(SELECT auth.uid()) AND lower(p.role::text) IN ('admin','ceo'))
);

-- Deterministic stratified initial corpus, sourced from existing approved
-- category/service aliases. These are intent labels only, NOT graded judgments
-- that a particular business provides a product/service.
WITH selected AS (
  SELECT alias,language,intent_key,categories,
    row_number() OVER (
      PARTITION BY language,intent_key
      ORDER BY md5(alias || intent_key)
    ) AS class_rank
  FROM public.search_dictionary
  WHERE review_status='approved' AND is_active
    AND alias_kind IN ('category','service')
    AND language IN ('en','ta','si','ta-Latn','si-Latn')
),
seed AS (
  SELECT alias,language,intent_key,categories
  FROM selected
  WHERE class_rank <= 4
  ORDER BY language,intent_key,class_rank
  LIMIT 280
)
INSERT INTO public.search_evaluation_cases
 (query_text,language,expected_intent,expected_category,validation_status,label_source)
SELECT alias,language,intent_key,
  CASE WHEN cardinality(categories)>0 THEN categories[1] END,
  'awaiting_native_review','curated_dictionary'
FROM seed
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.search_evaluation_cases IS
 'SLBI v3 evaluation seed. Taxonomy-level labels awaiting native-speaker and business relevance review; not actual search logs.';
COMMENT ON TABLE slbi_search_internal.business_embeddings IS
 'Inactive 384-dimensional vector store. Embeddings must be generated by one verified versioned multilingual model; never mix model versions.';
