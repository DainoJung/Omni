-- ============================================
-- Omni v2 — Cost Limits & Security
-- Migration: 003_cost_limits_and_security.sql
-- ============================================

-- 비용 상한 체크 함수
CREATE OR REPLACE FUNCTION check_daily_cost_limit(
  p_division_id UUID,
  p_daily_limit NUMERIC DEFAULT 50000  -- ₩50,000
)
RETURNS TABLE (
  within_limit BOOLEAN,
  current_cost NUMERIC,
  daily_limit NUMERIC,
  remaining NUMERIC
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(dm.metric_value), 0) <= p_daily_limit AS within_limit,
    COALESCE(SUM(dm.metric_value), 0) AS current_cost,
    p_daily_limit AS daily_limit,
    p_daily_limit - COALESCE(SUM(dm.metric_value), 0) AS remaining
  FROM division_metrics dm
  WHERE dm.division_id = p_division_id
    AND dm.metric_name = 'api_cost'
    AND dm.period = 'daily'
    AND dm.period_start = CURRENT_DATE;
END;
$$;

-- Division 자동 일시정지 (비용 초과 시)
CREATE OR REPLACE FUNCTION auto_pause_on_cost_exceeded()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_daily_limit NUMERIC;
  v_current_cost NUMERIC;
BEGIN
  -- Division config에서 daily_limit 가져오기 (기본값 50000)
  SELECT COALESCE((d.config->>'daily_cost_limit')::NUMERIC, 50000)
  INTO v_daily_limit
  FROM divisions d
  WHERE d.id = NEW.division_id;

  -- 오늘 총 비용 계산
  SELECT COALESCE(SUM(metric_value), 0)
  INTO v_current_cost
  FROM division_metrics
  WHERE division_id = NEW.division_id
    AND metric_name = 'api_cost'
    AND period = 'daily'
    AND period_start = CURRENT_DATE;

  -- 초과 시 Division 일시정지 + Critical Decision 생성
  IF v_current_cost > v_daily_limit THEN
    UPDATE divisions SET status = 'paused', updated_at = now()
    WHERE id = NEW.division_id AND status = 'operating';

    INSERT INTO critical_decisions (division_id, priority, title, description, context, options, recommendation)
    VALUES (
      NEW.division_id,
      'high',
      '일일 비용 상한 초과',
      format('오늘 API 비용이 ₩%s로, 상한 ₩%s를 초과했습니다. Division이 자동 일시정지되었습니다.', v_current_cost::TEXT, v_daily_limit::TEXT),
      jsonb_build_object('current_cost', v_current_cost, 'daily_limit', v_daily_limit),
      '[{"label":"재개","description":"비용 초과를 인지하고 Division을 재개합니다","recommended":false},{"label":"상한 조정","description":"일일 비용 상한을 높입니다","recommended":true},{"label":"유지","description":"일시정지 상태를 유지합니다","recommended":false}]'::jsonb,
      1
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 트리거: api_cost 메트릭 INSERT 시 비용 체크
CREATE TRIGGER trg_check_cost_limit
  AFTER INSERT ON division_metrics
  FOR EACH ROW
  WHEN (NEW.metric_name = 'api_cost')
  EXECUTE FUNCTION auto_pause_on_cost_exceeded();

-- Division sunset 시 에이전트 자동 비활성화
CREATE OR REPLACE FUNCTION auto_deactivate_on_sunset()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'sunset' AND OLD.status != 'sunset' THEN
    UPDATE agents SET status = 'inactive'
    WHERE division_id = NEW.id;

    NEW.sunset_at = now();

    INSERT INTO agent_events (division_id, event_type, payload)
    VALUES (NEW.id, 'task_complete', jsonb_build_object(
      'action', 'division_sunset',
      'detail', format('Division "%s" has been sunset. All agents deactivated.', NEW.name)
    ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_division_sunset
  BEFORE UPDATE ON divisions
  FOR EACH ROW
  WHEN (NEW.status = 'sunset')
  EXECUTE FUNCTION auto_deactivate_on_sunset();

-- 스킬 화이트리스트 테이블
CREATE TABLE IF NOT EXISTS skill_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,           -- "clawhub" | "workspace"
  approved_by TEXT,               -- 승인자
  approved_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- Realtime publication for new tables
ALTER TABLE skill_whitelist REPLICA IDENTITY FULL;
