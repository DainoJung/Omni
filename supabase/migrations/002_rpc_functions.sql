-- ============================================
-- Omni v2 Agent OS — RPC Functions
-- Migration: 002_rpc_functions.sql
-- ============================================

-- ============================================
-- 1. search_memories: 벡터 유사도 기반 메모리 검색
-- ============================================
CREATE OR REPLACE FUNCTION search_memories(
  query_embedding  VECTOR(1536),
  match_threshold  FLOAT   DEFAULT 0.7,
  match_count      INT     DEFAULT 10,
  filter_tags      TEXT[]  DEFAULT NULL,
  filter_category  TEXT    DEFAULT NULL
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
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE 1 - (m.embedding <=> query_embedding) > match_threshold
    AND (filter_tags IS NULL OR m.tags && filter_tags)
    AND (filter_category IS NULL OR m.category = filter_category)
    AND m.confidence > 0.3  -- decay된 것 제외
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- ============================================
-- 2. decay_memories: 월별 메모리 신뢰도 감쇠
-- ============================================
CREATE OR REPLACE FUNCTION decay_memories()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  -- 3개월 이상 참조되지 않은 메모리: confidence *= 0.9 (최소 0.1)
  UPDATE memories
  SET
    confidence  = GREATEST(confidence * 0.9, 0.1),
    decayed_at  = now(),
    updated_at  = now()
  WHERE
    updated_at < now() - INTERVAL '3 months'
    AND (decayed_at IS NULL OR decayed_at < now() - INTERVAL '3 months');

  -- 무시 횟수가 참조 횟수의 2배 초과이고 5회 이상 무시된 메모리: confidence *= 0.85 (최소 0.1)
  UPDATE memories
  SET
    confidence = GREATEST(confidence * 0.85, 0.1),
    decayed_at = now(),
    updated_at = now()
  WHERE
    times_ignored > times_referenced * 2
    AND times_ignored > 5;
END;
$$;

-- ============================================
-- 3. get_division_summary: Division 요약 정보 반환
-- ============================================
CREATE OR REPLACE FUNCTION get_division_summary(p_division_id UUID)
RETURNS TABLE (
  id                    UUID,
  name                  TEXT,
  slug                  TEXT,
  status                TEXT,
  config                JSONB,
  created_at            TIMESTAMPTZ,
  agent_count           BIGINT,
  recent_events_count   BIGINT,
  pending_decisions_count BIGINT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.slug,
    d.status,
    d.config,
    d.created_at,
    (
      SELECT COUNT(*)
      FROM agents a
      WHERE a.division_id = d.id
    ) AS agent_count,
    (
      SELECT COUNT(*)
      FROM agent_events e
      WHERE e.division_id = d.id
        AND e.created_at > now() - INTERVAL '24 hours'
    ) AS recent_events_count,
    (
      SELECT COUNT(*)
      FROM critical_decisions cd
      WHERE cd.division_id = d.id
        AND cd.status = 'pending'
    ) AS pending_decisions_count
  FROM divisions d
  WHERE d.id = p_division_id;
END;
$$;
