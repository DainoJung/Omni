-- ============================================
-- Omni v2 — Agent Requirements & Credentials
-- Migration: 005_agent_requirements.sql
-- ============================================

-- 에이전트별 외부 서비스 요구사항 + 인증 정보 저장
CREATE TABLE IF NOT EXISTS agent_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id   UUID REFERENCES divisions(id) ON DELETE CASCADE,
  agent_id      UUID REFERENCES agents(id) ON DELETE CASCADE,
  service       TEXT NOT NULL,                            -- "YouTube Data API v3"
  type          TEXT NOT NULL,                            -- "api_key" | "oauth" | "credential" | "account"
  env_key       TEXT NOT NULL,                            -- "YOUTUBE_API_KEY"
  env_value     TEXT,                                     -- 암호화된 값 (null이면 미설정)
  status        TEXT NOT NULL DEFAULT 'missing',          -- "missing" | "configured" | "expired" | "invalid"
  setup_url     TEXT,                                     -- 사용자 안내 URL
  description   TEXT,                                     -- 왜 필요한지
  required      BOOLEAN NOT NULL DEFAULT true,
  configured_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_credentials_division ON agent_credentials(division_id);
CREATE INDEX idx_credentials_status ON agent_credentials(status);
CREATE UNIQUE INDEX idx_credentials_unique ON agent_credentials(division_id, env_key);

-- pipeline_outputs에 file_url 컬럼 추가 (Storage 연동용)
ALTER TABLE pipeline_outputs ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE pipeline_outputs ADD COLUMN IF NOT EXISTS output_format TEXT DEFAULT 'json';
