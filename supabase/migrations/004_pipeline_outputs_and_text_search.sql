-- ============================================
-- Omni v2 — Pipeline Outputs & Text Search
-- Migration: 004_pipeline_outputs_and_text_search.sql
-- ============================================

-- ============================================
-- Pipeline Outputs: 파이프라인 단계별 산출물 저장
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_outputs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id     UUID REFERENCES divisions(id) ON DELETE CASCADE,
  agent_id        UUID REFERENCES agents(id),
  pipeline_run_id TEXT NOT NULL,
  step_name       TEXT NOT NULL,
  step_order      INT NOT NULL DEFAULT 0,
  output_type     TEXT NOT NULL,
  output_data     JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'completed',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pipeline_outputs_division ON pipeline_outputs(division_id, created_at DESC);
CREATE INDEX idx_pipeline_outputs_run ON pipeline_outputs(pipeline_run_id, step_order);
ALTER TABLE pipeline_outputs REPLICA IDENTITY FULL;

-- ============================================
-- search_memories_text: 텍스트 기반 메모리 검색 (벡터 fallback)
-- ============================================
CREATE OR REPLACE FUNCTION search_memories_text(
  p_query          TEXT,
  p_match_count    INT     DEFAULT 10,
  p_filter_tags    TEXT[]  DEFAULT NULL,
  p_filter_category TEXT   DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  content     TEXT,
  category    TEXT,
  tags        TEXT[],
  confidence  NUMERIC,
  similarity  FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.category,
    m.tags,
    m.confidence,
    ts_rank(to_tsvector('simple', m.content), plainto_tsquery('simple', p_query))::FLOAT AS similarity
  FROM memories m
  WHERE to_tsvector('simple', m.content) @@ plainto_tsquery('simple', p_query)
    AND (p_filter_tags IS NULL OR m.tags && p_filter_tags)
    AND (p_filter_category IS NULL OR m.category = p_filter_category)
    AND m.confidence > 0.3
  ORDER BY similarity DESC
  LIMIT p_match_count;
END;
$$;
