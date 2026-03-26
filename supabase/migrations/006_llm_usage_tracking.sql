-- 006: LLM API 사용량 추적 테이블
-- Per-call 단위로 모든 LLM 호출을 기록하여 비용 추적 + Division 학습 데이터로 활용

-- ──────────────────────────────────────
-- 1. llm_usage: 개별 LLM 호출 로그
-- ──────────────────────────────────────
CREATE TABLE llm_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id   UUID REFERENCES divisions(id) ON DELETE SET NULL,
  agent_id      UUID REFERENCES agents(id) ON DELETE SET NULL,
  -- LLM 호출 정보
  provider      TEXT NOT NULL DEFAULT 'openai',       -- openai | gemini | anthropic
  model         TEXT NOT NULL,                         -- gpt-5 | gpt-5-mini | gemini-2.5-flash 등
  endpoint      TEXT NOT NULL DEFAULT 'responses',     -- responses | embeddings | images
  -- 토큰 사용량
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens  INTEGER NOT NULL DEFAULT 0,
  -- 비용 (KRW)
  cost_usd      NUMERIC NOT NULL DEFAULT 0,
  -- 컨텍스트
  caller        TEXT NOT NULL DEFAULT 'unknown',       -- gateway | chat | proposal | build | memory | pipeline
  metadata      JSONB DEFAULT '{}',                    -- 추가 컨텍스트 (pipeline_run_id, step 등)
  -- 시간
  latency_ms    INTEGER,                               -- 응답 시간
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 인덱스: 일별/월별 집계 쿼리 최적화
CREATE INDEX idx_llm_usage_created ON llm_usage(created_at DESC);
CREATE INDEX idx_llm_usage_division ON llm_usage(division_id, created_at DESC);
CREATE INDEX idx_llm_usage_model ON llm_usage(model, created_at DESC);
CREATE INDEX idx_llm_usage_caller ON llm_usage(caller, created_at DESC);

-- ──────────────────────────────────────
-- 2. 트리거: llm_usage INSERT 시 division_metrics에 자동 집계
-- ──────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_llm_usage_to_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- division_id가 있는 경우에만 division_metrics에 집계
  IF NEW.division_id IS NOT NULL AND NEW.cost_usd > 0 THEN
    INSERT INTO division_metrics (division_id, metric_name, metric_value, period, period_start, metadata)
    VALUES (
      NEW.division_id,
      'api_cost',
      NEW.cost_usd,
      'daily',
      CURRENT_DATE,
      jsonb_build_object('model', NEW.model, 'caller', NEW.caller)
    )
    ON CONFLICT (division_id, metric_name, period, period_start)
    DO UPDATE SET
      metric_value = division_metrics.metric_value + EXCLUDED.metric_value,
      metadata = jsonb_build_object(
        'last_model', NEW.model,
        'last_caller', NEW.caller,
        'updated_at', now()
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_llm_usage
  AFTER INSERT ON llm_usage
  FOR EACH ROW
  EXECUTE FUNCTION sync_llm_usage_to_metrics();

-- ──────────────────────────────────────
-- 3. 집계 뷰: 일별/모델별/caller별 요약
-- ──────────────────────────────────────
CREATE OR REPLACE VIEW llm_usage_daily_summary AS
SELECT
  date_trunc('day', created_at)::date AS day,
  division_id,
  model,
  caller,
  COUNT(*) AS call_count,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(total_tokens) AS total_tokens,
  SUM(cost_usd) AS total_cost_usd,
  AVG(latency_ms)::integer AS avg_latency_ms
FROM llm_usage
GROUP BY day, division_id, model, caller;

-- ──────────────────────────────────────
-- 4. RPC: 비용 요약 조회 (대시보드용)
-- ──────────────────────────────────────
CREATE OR REPLACE FUNCTION get_cost_summary(
  p_days INTEGER DEFAULT 7,
  p_division_id UUID DEFAULT NULL
)
RETURNS TABLE (
  day DATE,
  total_cost NUMERIC,
  total_calls BIGINT,
  total_tokens BIGINT,
  by_model JSONB,
  by_caller JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('day', u.created_at)::date AS day,
    SUM(u.cost_usd) AS total_cost,
    COUNT(*) AS total_calls,
    SUM(u.total_tokens)::bigint AS total_tokens,
    jsonb_object_agg(
      COALESCE(u.model, 'unknown'),
      jsonb_build_object('cost', model_agg.model_cost, 'calls', model_agg.model_calls)
    ) AS by_model,
    jsonb_object_agg(
      COALESCE(u.caller, 'unknown'),
      jsonb_build_object('cost', caller_agg.caller_cost, 'calls', caller_agg.caller_calls)
    ) AS by_caller
  FROM llm_usage u
  LEFT JOIN LATERAL (
    SELECT SUM(u2.cost_usd) AS model_cost, COUNT(*) AS model_calls
    FROM llm_usage u2
    WHERE u2.model = u.model
      AND date_trunc('day', u2.created_at) = date_trunc('day', u.created_at)
      AND (p_division_id IS NULL OR u2.division_id = p_division_id)
  ) model_agg ON true
  LEFT JOIN LATERAL (
    SELECT SUM(u3.cost_usd) AS caller_cost, COUNT(*) AS caller_calls
    FROM llm_usage u3
    WHERE u3.caller = u.caller
      AND date_trunc('day', u3.created_at) = date_trunc('day', u.created_at)
      AND (p_division_id IS NULL OR u3.division_id = p_division_id)
  ) caller_agg ON true
  WHERE u.created_at >= CURRENT_DATE - p_days
    AND (p_division_id IS NULL OR u.division_id = p_division_id)
  GROUP BY date_trunc('day', u.created_at)::date
  ORDER BY day DESC;
END;
$$ LANGUAGE plpgsql;
