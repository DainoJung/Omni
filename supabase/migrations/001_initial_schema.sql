-- ============================================
-- Omni v2 Agent OS — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================

-- pgvector 확장 활성화 (벡터 검색용)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Division: 독립적 사업 단위
-- ============================================
CREATE TABLE divisions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,                            -- "Division B — 블로그"
  slug        TEXT UNIQUE NOT NULL,                     -- "division-b"
  description TEXT,                                     -- 사업 설명
  status      TEXT NOT NULL DEFAULT 'proposed',         -- proposed | designing | building | operating | paused | sunset
  config      JSONB NOT NULL DEFAULT '{}',              -- Division별 설정 (임계치, 규칙 등)
  proposal_text TEXT,                                   -- 원본 사업 제안 텍스트
  design_doc  JSONB,                                    -- Division Builder가 생성한 설계안
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  sunset_at   TIMESTAMPTZ                               -- 종료 시점
);

-- status 변경 추적
CREATE INDEX idx_divisions_status ON divisions(status);

-- ============================================
-- Agent: Division 안의 에이전트
-- ============================================
CREATE TABLE agents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id        UUID REFERENCES divisions(id) ON DELETE CASCADE,
  openclaw_agent_id  TEXT NOT NULL,                     -- OpenClaw agents.list의 id
  name               TEXT NOT NULL,                     -- "researcher_b"
  role               TEXT NOT NULL,                     -- "트렌드 탐색 + 키워드 분석"
  model              TEXT NOT NULL DEFAULT 'gpt-5-mini', -- LLM 모델
  status             TEXT NOT NULL DEFAULT 'inactive',  -- inactive | active | error | paused
  config             JSONB NOT NULL DEFAULT '{}',       -- 에이전트별 설정
  schedule           JSONB,                             -- Cron 스케줄 정보
  last_active_at     TIMESTAMPTZ,
  error_count        INT DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agents_division ON agents(division_id);
CREATE INDEX idx_agents_status   ON agents(status);

-- ============================================
-- Agent Skills: 에이전트별 설치된 스킬
-- ============================================
CREATE TABLE agent_skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID REFERENCES agents(id) ON DELETE CASCADE,
  skill_name  TEXT NOT NULL,                            -- "recipe-search"
  source      TEXT NOT NULL,                            -- "clawhub" | "workspace" | "bundled"
  version     TEXT,                                     -- semver (ClawHub 스킬)
  config      JSONB DEFAULT '{}',                       -- 스킬별 설정
  installed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, skill_name)
);

-- ============================================
-- Agent Events: 에이전트 활동 로그
-- ============================================
CREATE TABLE agent_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID REFERENCES agents(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id),
  event_type  TEXT NOT NULL,                            -- task_start | task_complete | task_error | escalation | message_sent | message_received
  payload     JSONB NOT NULL DEFAULT '{}',              -- 이벤트 데이터 (가변)
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 최근 이벤트 빠르게 조회
CREATE INDEX idx_events_agent_time    ON agent_events(agent_id, created_at DESC);
CREATE INDEX idx_events_division_time ON agent_events(division_id, created_at DESC);
-- Realtime 활성화
ALTER TABLE agent_events REPLICA IDENTITY FULL;

-- ============================================
-- Division Pipelines: 에이전트 간 연결 정의
-- ============================================
CREATE TABLE division_pipelines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id   UUID REFERENCES divisions(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES agents(id),
  to_agent_id   UUID REFERENCES agents(id),
  trigger_type  TEXT NOT NULL,                          -- "event" | "cron" | "manual"
  message_type  TEXT NOT NULL,                          -- AgentMessage.type
  config        JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Division Metrics: 성과 지표
-- ============================================
CREATE TABLE division_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id   UUID REFERENCES divisions(id) ON DELETE CASCADE,
  metric_name   TEXT NOT NULL,                          -- "posts_published" | "revenue" | "error_rate" | "api_cost"
  metric_value  NUMERIC NOT NULL,
  period        TEXT NOT NULL,                          -- "daily" | "weekly" | "monthly"
  period_start  DATE NOT NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(division_id, metric_name, period, period_start)
);

CREATE INDEX idx_metrics_division_period ON division_metrics(division_id, period_start DESC);

-- ============================================
-- Critical Decisions: HOTL 승인 큐
-- ============================================
CREATE TABLE critical_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id     UUID REFERENCES divisions(id),
  agent_id        UUID REFERENCES agents(id),
  priority        TEXT NOT NULL DEFAULT 'medium',       -- low | medium | high | critical
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  context         JSONB NOT NULL DEFAULT '{}',          -- 판단에 필요한 컨텍스트
  options         JSONB NOT NULL DEFAULT '[]',          -- 선택지 배열 [{label, description, recommended}]
  recommendation  INT,                                  -- options 배열 인덱스
  status          TEXT NOT NULL DEFAULT 'pending',      -- pending | approved | rejected | expired
  decided_at      TIMESTAMPTZ,
  decided_option  INT,                                  -- 선택된 options 인덱스
  decided_note    TEXT,                                 -- 사람의 코멘트
  expires_at      TIMESTAMPTZ,                          -- 자동 만료 시점
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_decisions_status ON critical_decisions(status, created_at DESC);
-- Realtime 활성화
ALTER TABLE critical_decisions REPLICA IDENTITY FULL;

-- ============================================
-- Institutional Memory: 구조화된 지식 저장
-- ============================================
CREATE TABLE memories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id      UUID REFERENCES divisions(id),       -- NULL이면 글로벌 메모리
  category         TEXT NOT NULL,                       -- "architecture" | "failure" | "domain" | "operations"
  content          TEXT NOT NULL,                       -- 교훈 내용
  tags             TEXT[] NOT NULL DEFAULT '{}',        -- 검색용 태그
  confidence       NUMERIC NOT NULL DEFAULT 0.5,        -- 0.0 ~ 1.0
  source           TEXT,                                -- 출처 설명
  times_referenced INT DEFAULT 0,                       -- 참조 횟수
  times_ignored    INT DEFAULT 0,                       -- 무시 횟수 (decay 계산용)
  embedding        VECTOR(1536),                        -- OpenAI text-embedding-3-small
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  decayed_at       TIMESTAMPTZ                          -- decay 적용 시점
);

-- 벡터 검색 인덱스
CREATE INDEX idx_memories_embedding ON memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
CREATE INDEX idx_memories_tags       ON memories USING gin(tags);
CREATE INDEX idx_memories_category   ON memories(category);
CREATE INDEX idx_memories_confidence ON memories(confidence DESC);

-- ============================================
-- System Config: Self-Awareness 상태 (단일 행)
-- ============================================
CREATE TABLE system_config (
  id               INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- 단일 행 강제
  connected_apis   JSONB NOT NULL DEFAULT '[]',         -- [{name, status, quotaUsed, quotaLimit}]
  installed_skills JSONB NOT NULL DEFAULT '[]',         -- [{name, source, version, agentId}]
  system_health    JSONB NOT NULL DEFAULT '{}',         -- {cpu, memory, apiErrorRate, ...}
  cost_tracking    JSONB NOT NULL DEFAULT '{}',         -- {mtdTotal, byAgent: {...}, byApi: {...}}
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- 초기 행 삽입
INSERT INTO system_config (id) VALUES (1);
