-- SLBI SemanticSearch v3 research vault (private and unreachable via REST).
-- Real vectors are written ONLY by a privileged, model-verified indexing worker.
-- This migration does NOT enable semantic search in production.
CREATE SCHEMA IF NOT EXISTS slbi_search_lab;
REVOKE ALL ON SCHEMA slbi_search_lab FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA slbi_search_lab TO service_role;

CREATE TABLE IF NOT EXISTS slbi_search_lab.business_embeddings (
 business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 model_id TEXT NOT NULL CHECK (char_length(model_id) BETWEEN 3 AND 100),
 model_revision TEXT NOT NULL CHECK (char_length(model_revision) BETWEEN 3 AND 120),
 content_sha256 TEXT NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
 embedding extensions.vector NOT NULL,
 indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY (business_id, model_id, model_revision),
 CONSTRAINT slbi_embedding_dimensions CHECK (extensions.vector_dims(embedding) BETWEEN 128 AND 2048)
);
ALTER TABLE slbi_search_lab.business_embeddings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON slbi_search_lab.business_embeddings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON slbi_search_lab.business_embeddings TO service_role;

CREATE TABLE IF NOT EXISTS slbi_search_lab.relevance_judgments (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 query_text TEXT NOT NULL CHECK (char_length(query_text) BETWEEN 2 AND 160),
 query_language TEXT NOT NULL CHECK (query_language IN ('en','ta','si','ta-Latn','si-Latn')),
 business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 grade SMALLINT NOT NULL CHECK (grade BETWEEN 0 AND 3),
 reviewer_reference TEXT NOT NULL CHECK (char_length(reviewer_reference) BETWEEN 3 AND 80),
 judged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(query_text, query_language, business_id, reviewer_reference)
);
ALTER TABLE slbi_search_lab.relevance_judgments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON slbi_search_lab.relevance_judgments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON slbi_search_lab.relevance_judgments TO service_role;

-- Internal-only model-specific cosine retrieval. No public or authenticated
-- browser EXECUTE privilege; business visibility remains approval-gated.
CREATE OR REPLACE FUNCTION slbi_search_lab.match_approved_business_embeddings(
 requested_model TEXT,
 requested_revision TEXT,
 query_embedding extensions.vector,
 max_results INTEGER DEFAULT 20
) RETURNS TABLE(business_id UUID, cosine_similarity DOUBLE PRECISION)
LANGUAGE SQL STABLE SECURITY INVOKER
SET search_path = slbi_search_lab, public, extensions
AS $$
 SELECT v.business_id, (1 - (v.embedding <=> query_embedding))::DOUBLE PRECISION
 FROM slbi_search_lab.business_embeddings v
 JOIN public.businesses b ON b.id = v.business_id
 WHERE b.status = 'approved'
 AND v.model_id = requested_model
 AND v.model_revision = requested_revision
 AND extensions.vector_dims(v.embedding) = extensions.vector_dims(query_embedding)
 ORDER BY v.embedding <=> query_embedding ASC
 LIMIT LEAST(50, GREATEST(1, COALESCE(max_results, 20)));
$$;
REVOKE ALL ON FUNCTION slbi_search_lab.match_approved_business_embeddings(
 TEXT, TEXT, extensions.vector, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION slbi_search_lab.match_approved_business_embeddings(
 TEXT, TEXT, extensions.vector, INTEGER
) TO service_role;

COMMENT ON TABLE slbi_search_lab.business_embeddings IS
 'Private semantic search research vectors; inactive until same-model native-language relevance and latency quality gates pass.';
