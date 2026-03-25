# Omni  — Technical Specification

> 구현에 필요한 기술 명세. 전략/아키텍처는 STRATEGY.md, ARCHITECTURE.md 참조.

---

## 1. OpenClaw 설치 및 Gateway 구성

### 1.1 설치

```bash
# OpenClaw CLI 설치
curl -fsSL https://openclaw.ai/install.sh | bash

# Gateway 데몬 설치 (launchd/systemd 자동 등록)
openclaw onboard --install-daemon

# AI 프로바이더 설정 (온보딩 위저드)
# → OpenAI API 키 입력, 기본 모델 선택
```

### 1.2 디렉토리 구조

```
~/.openclaw/
├── openclaw.json          # 메인 설정 (JSON5, 주석 가능)
├── workspace-omni/        # Omni OS 메인 워크스페이스
│   ├── AGENTS.md          # 에이전트 지시사항
│   ├── SOUL.md            # 에이전트 성격/원칙
│   └── skills/            # 워크스페이스 스킬 (최고 우선순위)
├── skills/                # 글로벌 스킬 (중간 우선순위)
├── agents/                # 에이전트별 상태
│   ├── orchestrator/
│   │   ├── agent/         # agentDir (auth-profiles.json 등)
│   │   └── sessions/      # 세션 스토어
│   ├── division-builder/
│   │   ├── agent/
│   │   └── sessions/
│   └── ...
└── cron/
    └── jobs.json          # 크론 잡 정의
```

### 1.3 Gateway 설정 (`~/.openclaw/openclaw.json`)

```json5
{
  // Gateway는 포트 18789에서 실행 (Control UI + WebChat)
  "gateway": {
    "port": 18789
  },

  // AI 프로바이더
  "ai": {
    "provider": "openai",
    "model": "gpt-5",           // 오케스트레이터/Builder용
    "fastModel": "gpt-5-mini"   // 워커 에이전트용
  },

  // 에이전트 목록
  "agents": {
    "defaults": {
      // 모든 에이전트 공통 설정
    },
    "list": [
      // → 섹션 2 참조
    ]
  },

  // 바인딩 (채널 → 에이전트 라우팅)
  "bindings": [
    // → 섹션 3 참조
  ],

  // 세션 도구 허용 (에이전트 간 통신)
  "tools": {
    "sessions": {
      "enabled": true,
      "allowedTools": [
        "sessions_send",
        "sessions_spawn",
        "sessions_list",
        "sessions_history",
        "session_status"
      ]
    }
  },

  // 스킬 설정
  "skills": {
    "load": {
      "extraDirs": []  // 추가 스킬 폴더 (최저 우선순위)
    }
  }
}
```

---

## 2. 멀티 에이전트 구성

### 2.1 에이전트 등록

```bash
# CLI로 에이전트 추가
openclaw agents add orchestrator
openclaw agents add division-builder
openclaw agents add researcher-b
openclaw agents add writer-b
openclaw agents add publisher-b

# 에이전트 목록 확인
openclaw agents list --bindings
```

### 2.2 에이전트 목록 설정

```json5
// openclaw.json > agents.list
"list": [
  {
    "id": "orchestrator",
    "default": true,
    "name": "Omni Orchestrator",
    "workspace": "~/.openclaw/workspace-omni",
    "agentDir": "~/.openclaw/agents/orchestrator/agent"
    // 기본 에이전트: 사용자 대화의 진입점
    // Division 전체 조율, Critical Decision 에스컬레이션
  },
  {
    "id": "division-builder",
    "name": "Division Builder",
    "workspace": "~/.openclaw/workspace-omni/agents/division-builder",
    "agentDir": "~/.openclaw/agents/division-builder/agent"
    // Meta Layer: 새 Division 설계/구축
    // ClawHub 탐색, 스킬 생성, 에이전트 등록
  },
  {
    "id": "researcher-x",
    "name": "Division X Researcher",
    "workspace": "~/.openclaw/workspace-omni/agents/division-x/researcher",
    "agentDir": "~/.openclaw/agents/researcher-x/agent"
    // Division X 워커: 도메인 데이터 탐색
    // 모델: gpt-5-mini (빠른 실행)
  },
  {
    "id": "writer-x",
    "name": "Division X Writer",
    "workspace": "~/.openclaw/workspace-omni/agents/division-x/writer",
    "agentDir": "~/.openclaw/agents/writer-x/agent"
    // Division X 워커: 콘텐츠/결과물 생성
    // 모델: gpt-5 (품질 중요)
  },
  {
    "id": "publisher-x",
    "name": "Division X Publisher",
    "workspace": "~/.openclaw/workspace-omni/agents/division-x/publisher",
    "agentDir": "~/.openclaw/agents/publisher-x/agent"
    // Division X 워커: 결과물 발행 + 추적
    // 모델: gpt-5-mini
  }
]
```

### 2.3 에이전트 격리 원칙

- 각 에이전트는 독립된 workspace, agentDir, 세션 스토어를 가짐
- `agentDir` 재사용 금지 (세션 충돌 발생)
- 인증은 에이전트별: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 스킬은 워크스페이스별: `<workspace>/skills/` (최고 우선순위)

---

## 3. 에이전트 간 통신 프로토콜

### 3.1 sessions_send (동기/비동기 메시지)

```
sessions_send(
  sessionKey: string,     // 대상 세션 키 ("agent:<agentId>:<mainKey>")
  message: string,        // 전송할 메시지 (자연어 또는 JSON)
  timeoutSeconds: number  // 0=fire-and-forget, >0=응답 대기
)
```

**반환값:**
- `timeoutSeconds > 0`: `{ runId, status: "ok", reply }` 또는 `{ runId, status: "timeout", error }`
- `timeoutSeconds = 0`: `{ runId, status: "sent" }`
- 최대 5회 ping-pong 가능

**Omni 사용 패턴:**

```
오케스트레이터 → researcher-b:
  sessions_send("agent:researcher-b:main", "트렌드 탐색 실행해줘", 120)
  → { status: "ok", reply: "12개 키워드 발견. 상위 3개: ..." }

researcher-b → writer-b:
  sessions_send("agent:writer-x:main", '{"type":"write_post","topic":"example-topic","keywords":["키워드1","키워드2"]}', 300)
  → { status: "ok", reply: '{"type":"post_ready","postId":"...","slug":"cream-pasta"}' }

writer-b → publisher-b:
  sessions_send("agent:publisher-b:main", '{"type":"publish","postId":"..."}', 60)
  → { status: "ok", reply: '{"type":"published","url":"https://..."}' }
```

### 3.2 sessions_spawn (비동기 서브 에이전트)

```
sessions_spawn(
  agentId: string,       // 대상 에이전트 ID
  message: string,       // 작업 지시
  sessionKey?: string,   // 세션 키 (생략 시 자동 생성)
  tools?: string[]       // 허용할 도구 목록 (제한 가능)
)
```

**반환값:** `{ status: "accepted", runId, childSessionKey }` (항상 즉시 반환, non-blocking)
**완료 시:** 자동으로 요청자 채널에 결과 announce

**제한:** 서브 에이전트는 `sessions_spawn` 호출 불가 (깊이 1 제한)

**Omni 사용 패턴:**

```
Division Builder가 새 Division 구축 시:
  sessions_spawn("researcher-b", "초기 설정 완료. 첫 트렌드 탐색 시작해줘.")
  → 즉시 반환, researcher-b가 비동기로 실행
```

### 3.3 Omni 메시지 포맷 규약

에이전트 간 메시지는 JSON으로 통일. 자연어 메시지는 오케스트레이터↔사람 구간에서만 사용.

```typescript
// 에이전트 간 표준 메시지 포맷
interface AgentMessage {
  type: string;          // 메시지 타입 (아래 정의)
  divisionId: string;    // Division 식별자
  payload: object;       // 타입별 데이터
  metadata?: {
    requestId: string;   // 추적용 UUID
    timestamp: string;   // ISO 8601
    source: string;      // 발신 에이전트 ID
  };
}

// 메시지 타입 정의
type MessageType =
  // 파이프라인 흐름
  | "research_request"     // 오케스트레이터 → researcher: 탐색 요청
  | "research_result"      // researcher → 다음 단계: 탐색 결과
  | "write_request"        // → writer: 콘텐츠 작성 요청
  | "write_result"         // writer → 다음 단계: 작성 완료
  | "publish_request"      // → publisher: 발행 요청
  | "publish_result"       // publisher → 오케스트레이터: 발행 완료

  // 시스템 이벤트
  | "error"                // 에러 발생
  | "escalation"           // Critical Decision 에스컬레이션
  | "memory_save"          // Institutional Memory 저장 요청
  | "health_check"         // 상태 확인

  // Division Builder
  | "proposal_analysis"    // Builder 분석 결과
  | "design_review"        // 설계안 → 사람 검토 요청
  | "design_feedback"      // 사람 피드백 → Builder
  | "build_progress"       // 구축 진행 상황
```

---

## 4. 채널 바인딩

### 4.1 바인딩 설정

```json5
// openclaw.json > bindings
"bindings": [
  // Discord에서 Omni 오케스트레이터로 라우팅
  {
    "agentId": "orchestrator",
    "match": {
      "channel": "discord",
      "accountId": "omni-bot"
    }
  },
  // WebChat은 오케스트레이터로 (대시보드에서 직접 대화)
  {
    "agentId": "orchestrator",
    "match": {
      "channel": "webchat"
    }
  }
]
```

### 4.2 채널 설정

```bash
# Discord 봇 연결
openclaw channels login --channel discord --account omni-bot

# 채널 상태 확인
openclaw channels status --probe

# Gateway 재시작 (설정 변경 후)
openclaw gateway restart
```

---

## 5. Cron 스케줄링

### 5.1 Cron 잡 형식 (`~/.openclaw/cron/jobs.json`)

```json
{
  "version": 1,
  "jobs": [
    {
      "id": "researcher-x-scan",
      "agentId": "researcher-x",
      "name": "Trend Scan (Division X)",
      "enabled": true,
      "schedule": {
        "kind": "every",
        "everyMs": 7200000
      },
      "sessionTarget": "main",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "{\"type\":\"research_request\",\"divisionId\":\"division-b\",\"payload\":{\"scope\":\"trending_topics\"}}"
      }
    },
    {
      "id": "system-health-pulse",
      "agentId": "orchestrator",
      "name": "System Health Pulse",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "cron": "0 */1 * * *",
        "tz": "Asia/Seoul"
      },
      "sessionTarget": "main",
      "wakeMode": "now",
      "payload": {
        "kind": "systemEvent",
        "text": "[PULSE] Run system health check and report anomalies."
      }
    },
    {
      "id": "daily-report",
      "agentId": "orchestrator",
      "name": "Daily Division Report",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "cron": "0 9 * * *",
        "tz": "Asia/Seoul"
      },
      "sessionTarget": "main",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "모든 Division의 어제 성과를 요약해서 보고해줘."
      },
      "delivery": {
        "mode": "announce",
        "channel": "discord",
        "target": "omni-reports"
      }
    }
  ]
}
```

### 5.2 스케줄 타입 요약

| kind | 설명 | 예시 |
|------|------|------|
| `every` | 밀리초 간격 반복 | `{ "kind": "every", "everyMs": 3600000 }` (1시간) |
| `cron` | 크론 표현식 | `{ "kind": "cron", "cron": "0 9 * * *", "tz": "Asia/Seoul" }` |
| `at` | 1회성 예약 | `{ "kind": "at", "at": "2026-04-01T09:00:00+09:00" }` |

### 5.3 Payload 타입

| kind | 설명 | 용도 |
|------|------|------|
| `agentTurn` | 에이전트에게 메시지 전달 (대화 턴) | 작업 지시, 질문 |
| `systemEvent` | 시스템 이벤트 주입 | 로그, 상태 알림, 트리거 |

---

## 6. 스킬 시스템

### 6.1 SKILL.md 포맷

```markdown
---
name: recipe-search
description: Search recipes from multiple sources with fallback strategy.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - YOUTUBE_API_KEY
      bins:
        - curl
    primaryEnv: YOUTUBE_API_KEY
    emoji: "🍳"
---

# Domain Search

도메인별 데이터를 검색합니다.

## 입력
- keyword: 검색 키워드 (한국어)
- maxResults: 최대 결과 수 (기본 5)

## 동작
1. YouTube Data API v3에서 키워드 검색 (regionCode=KR)
2. 결과 없으면 Google Custom Search API fallback
3. 그래도 없으면 일반 웹 검색 fallback

## 출력
JSON 배열: [{ title, source, url, description, thumbnailUrl }]

## 제한사항
- YouTube API 할당량: 10,000 units/day
- 검색당 약 100 units 소모
- rate limit: 초당 3 요청 이하
```

### 6.2 스킬 우선순위 (높은 순)

1. `<workspace>/skills/` — 워크스페이스 스킬 (에이전트별)
2. `~/.openclaw/skills/` — 글로벌 로컬 스킬
3. 번들 스킬 — OpenClaw 내장

동일 이름 충돌 시 높은 우선순위가 덮어씀.

### 6.3 스킬 디렉토리 구조

```
skills/
├── recipe-search/
│   ├── SKILL.md              # 필수
│   └── scripts/
│       └── search.py         # 실행 스크립트
├── coupang-affiliate/
│   ├── SKILL.md
│   └── references/
│       └── disclaimer.md     # 고지 문구 템플릿
├── blog-publisher/
│   ├── SKILL.md
│   └── scripts/
│       └── publish.sh
└── ...
```

### 6.4 ClawHub 스킬 사용

```bash
# ClawHub에서 스킬 검색
openclaw skills search "youtube trends"

# 스킬 설치 (글로벌)
openclaw skills install youtube-trends

# 스킬 설치 (특정 에이전트 워크스페이스에)
openclaw skills install seo-optimizer --workspace ~/.openclaw/workspace-omni/agents/division-b/writer

# 설치된 스킬 목록
openclaw skills list

# 스킬 버전 고정
# → 스킬 디렉토리의 .clawhub/lock.json에 버전 기록됨
```

---

## 7. Supabase 스키마

### 7.1 ERD 개요

```
divisions ──< agents ──< agent_events
    │              │
    │              └──< agent_skills
    │
    ├──< division_pipelines
    │
    ├──< division_metrics
    │
    └──< critical_decisions

memories (독립 테이블, division_id 참조)
system_config (단일 행, Self-Awareness)
```

### 7.2 DDL

```sql
-- ============================================
-- Division: 독립적 사업 단위
-- ============================================
CREATE TABLE divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                           -- "Division X — [사업명]"
  slug TEXT UNIQUE NOT NULL,                    -- "division-b"
  description TEXT,                             -- 사업 설명
  status TEXT NOT NULL DEFAULT 'proposed',      -- proposed | designing | building | operating | paused | sunset
  config JSONB NOT NULL DEFAULT '{}',           -- Division별 설정 (임계치, 규칙 등)
  proposal_text TEXT,                           -- 원본 사업 제안 텍스트
  design_doc JSONB,                             -- Division Builder가 생성한 설계안
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  sunset_at TIMESTAMPTZ                         -- 종료 시점
);

-- status 변경 추적
CREATE INDEX idx_divisions_status ON divisions(status);

-- ============================================
-- Agent: Division 안의 에이전트
-- ============================================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
  openclaw_agent_id TEXT NOT NULL,              -- OpenClaw agents.list의 id
  name TEXT NOT NULL,                           -- "researcher_b"
  role TEXT NOT NULL,                           -- "트렌드 탐색 + 키워드 분석"
  model TEXT NOT NULL DEFAULT 'gpt-5-mini',     -- LLM 모델
  status TEXT NOT NULL DEFAULT 'inactive',      -- inactive | active | error | paused
  config JSONB NOT NULL DEFAULT '{}',           -- 에이전트별 설정
  schedule JSONB,                               -- Cron 스케줄 정보
  last_active_at TIMESTAMPTZ,
  error_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agents_division ON agents(division_id);
CREATE INDEX idx_agents_status ON agents(status);

-- ============================================
-- Agent Skills: 에이전트별 설치된 스킬
-- ============================================
CREATE TABLE agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,                     -- "recipe-search"
  source TEXT NOT NULL,                         -- "clawhub" | "workspace" | "bundled"
  version TEXT,                                 -- semver (ClawHub 스킬)
  config JSONB DEFAULT '{}',                    -- 스킬별 설정
  installed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, skill_name)
);

-- ============================================
-- Agent Events: 에이전트 활동 로그
-- ============================================
CREATE TABLE agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id),
  event_type TEXT NOT NULL,                     -- task_start | task_complete | task_error | escalation | message_sent | message_received
  payload JSONB NOT NULL DEFAULT '{}',          -- 이벤트 데이터 (가변)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 최근 이벤트 빠르게 조회
CREATE INDEX idx_events_agent_time ON agent_events(agent_id, created_at DESC);
CREATE INDEX idx_events_division_time ON agent_events(division_id, created_at DESC);
-- Realtime 활성화
ALTER TABLE agent_events REPLICA IDENTITY FULL;

-- ============================================
-- Division Pipelines: 에이전트 간 연결 정의
-- ============================================
CREATE TABLE division_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES agents(id),
  to_agent_id UUID REFERENCES agents(id),
  trigger_type TEXT NOT NULL,                   -- "event" | "cron" | "manual"
  message_type TEXT NOT NULL,                   -- AgentMessage.type
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Division Metrics: 성과 지표
-- ============================================
CREATE TABLE division_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,                    -- "posts_published" | "revenue" | "error_rate" | "api_cost"
  metric_value NUMERIC NOT NULL,
  period TEXT NOT NULL,                         -- "daily" | "weekly" | "monthly"
  period_start DATE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(division_id, metric_name, period, period_start)
);

CREATE INDEX idx_metrics_division_period ON division_metrics(division_id, period_start DESC);

-- ============================================
-- Critical Decisions: HOTL 승인 큐
-- ============================================
CREATE TABLE critical_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id),
  agent_id UUID REFERENCES agents(id),
  priority TEXT NOT NULL DEFAULT 'medium',      -- low | medium | high | critical
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}',          -- 판단에 필요한 컨텍스트
  options JSONB NOT NULL DEFAULT '[]',          -- 선택지 배열 [{label, description, recommended}]
  recommendation INT,                           -- options 배열 인덱스
  status TEXT NOT NULL DEFAULT 'pending',       -- pending | approved | rejected | expired
  decided_at TIMESTAMPTZ,
  decided_option INT,                           -- 선택된 options 인덱스
  decided_note TEXT,                            -- 사람의 코멘트
  expires_at TIMESTAMPTZ,                       -- 자동 만료 시점
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_decisions_status ON critical_decisions(status, created_at DESC);
-- Realtime 활성화
ALTER TABLE critical_decisions REPLICA IDENTITY FULL;

-- ============================================
-- Institutional Memory: 구조화된 지식 저장
-- ============================================
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID REFERENCES divisions(id),    -- NULL이면 글로벌 메모리
  category TEXT NOT NULL,                       -- "architecture" | "failure" | "domain" | "operations"
  content TEXT NOT NULL,                        -- 교훈 내용
  tags TEXT[] NOT NULL DEFAULT '{}',            -- 검색용 태그
  confidence NUMERIC NOT NULL DEFAULT 0.5,      -- 0.0 ~ 1.0
  source TEXT,                                  -- 출처 설명
  times_referenced INT DEFAULT 0,              -- 참조 횟수
  times_ignored INT DEFAULT 0,                 -- 무시 횟수 (decay 계산용)
  embedding VECTOR(1536),                      -- OpenAI text-embedding-3-small
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  decayed_at TIMESTAMPTZ                       -- decay 적용 시점
);

-- 벡터 검색 인덱스
CREATE INDEX idx_memories_embedding ON memories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
CREATE INDEX idx_memories_tags ON memories USING gin(tags);
CREATE INDEX idx_memories_category ON memories(category);
CREATE INDEX idx_memories_confidence ON memories(confidence DESC);

-- ============================================
-- System Config: Self-Awareness 상태
-- ============================================
CREATE TABLE system_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- 단일 행
  connected_apis JSONB NOT NULL DEFAULT '[]',    -- [{name, status, quotaUsed, quotaLimit}]
  installed_skills JSONB NOT NULL DEFAULT '[]',  -- [{name, source, version, agentId}]
  system_health JSONB NOT NULL DEFAULT '{}',     -- {cpu, memory, apiErrorRate, ...}
  cost_tracking JSONB NOT NULL DEFAULT '{}',     -- {mtdTotal, byAgent: {...}, byApi: {...}}
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 초기 행 삽입
INSERT INTO system_config (id) VALUES (1);
```

### 7.3 RLS (Row Level Security)

Phase 0~2에서는 단일 사용자(Daino)이므로 RLS 최소화.
Phase 3(제품화)에서 `user_id` 컬럼 추가 후 활성화.

```sql
-- Phase 3에서 추가할 것:
-- ALTER TABLE divisions ADD COLUMN user_id UUID REFERENCES auth.users(id);
-- ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "own_divisions" ON divisions FOR ALL USING (auth.uid() = user_id);
```

### 7.4 Realtime 구독 (대시보드용)

```typescript
// Dashboard에서 실시간 이벤트 수신
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 에이전트 이벤트 실시간 수신
supabase
  .channel('agent-events')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'agent_events',
  }, (payload) => {
    // payload.new: 새 이벤트
    updateActivityFeed(payload.new);
  })
  .subscribe();

// Critical Decision 알림
supabase
  .channel('decisions')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'critical_decisions',
    filter: 'status=eq.pending',
  }, (payload) => {
    showDecisionNotification(payload.new);
  })
  .subscribe();
```

---

## 8. Rules Engine 구현

### 8.1 구현 방식

Rules Engine은 OpenClaw 워크스페이스 스킬로 구현.
오케스트레이터 에이전트의 시스템 프롬프트에 규칙을 내장하고,
Supabase에 결정 기록을 남기는 구조.

### 8.2 스킬 정의

```markdown
---
name: rules-engine
description: Evaluate agent actions against safety rules and escalate Critical Decisions.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - SUPABASE_URL
        - SUPABASE_SERVICE_KEY
    primaryEnv: SUPABASE_URL
---

# Rules Engine

모든 에이전트 액션을 실행 전에 이 규칙으로 평가합니다.

## Critical Decision 기준

아래 조건 중 하나라도 해당하면 `critical_decisions` 테이블에 삽입하고,
사람의 승인을 기다립니다:

1. **비용**: 단일 작업의 예상 비용 > ₩50,000/일
2. **외부 커뮤니케이션**: 고객/외부 서비스에 메시지 발송
3. **비가역적 작업**: 데이터 삭제, 계정 변경, 대량 작업 (10건 이상)
4. **낮은 확신도**: 에이전트가 자체 판단 확신도 < 0.7로 보고
5. **Division 변경**: 새 Division 생성, 기존 Division 종료, 에이전트 추가/제거
6. **새 스킬 설치**: ClawHub에서 외부 스킬 설치 시 승인 필요

## 자동 차단 (무조건 거부)

- 파일시스템 루트 접근
- 환경 변수에 저장된 시크릿 노출
- 다른 에이전트의 agentDir 직접 접근

## 에스컬레이션 포맷

critical_decisions 테이블에 INSERT:
- priority: 규칙 번호에 따라 (1,3=high, 2,4=medium, 5,6=low)
- context: 해당 작업의 전체 컨텍스트 (JSON)
- options: 최소 2개 선택지 + 추천
- expires_at: 생성 후 24시간 (기본)
```

---

## 9. 대시보드 ↔ 백엔드 인터페이스

### 9.1 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Hosting**: Vercel
- **데이터**: Supabase JS Client (REST + Realtime)
- **스타일**: Tailwind CSS (Palantir Foundry 다크 테마)
- **상태**: React Server Components + Supabase Realtime

### 9.2 데이터 접근 패턴

| 화면 | 데이터 소스 | 접근 방식 |
|------|------------|-----------|
| Command Center | divisions, division_metrics, agent_events (최근 20) | SSR + Realtime |
| Division Dashboard | agents, agent_events, division_metrics | SSR + Realtime |
| Agent Detail | agents, agent_events, agent_skills | SSR + Realtime |
| Division Proposal | (대화) + divisions (INSERT) | Client-side + REST |
| Institutional Memory | memories | REST + Vector search (RPC) |
| Strategy Layer | divisions, division_metrics (집계) | SSR |
| Critical Decisions | critical_decisions | SSR + Realtime |

### 9.3 Supabase RPC (커스텀 함수)

```sql
-- 메모리 벡터 검색
CREATE OR REPLACE FUNCTION search_memories(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_tags TEXT[] DEFAULT NULL,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  category TEXT,
  tags TEXT[],
  confidence NUMERIC,
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.content, m.category, m.tags, m.confidence,
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
```

---

## 10. 디렉토리 / 파일 규약

### 10.1 프로젝트 디렉토리 (omni-/)

```
omni-/
├── CLAUDE.md                          # Claude Code 컨텍스트
├── docs/
│   ├── STRATEGY.md                    # 전략
│   ├── ARCHITECTURE.md                # 아키텍처
│   ├── ROADMAP.md                     # 로드맵
│   ├── ZERO_TO_ONE.md                 # 평가
│   ├── V1_LESSONS.md                  # v1 교훈
│   ├── TECH_SPEC.md                   # 이 문서
│   └── DIVISION_BUILDER_SPEC.md       # Builder 명세
├── agents/
│   ├── orchestrator/
│   │   ├── AGENTS.md                  # 오케스트레이터 시스템 프롬프트
│   │   ├── SOUL.md                    # 성격/원칙
│   │   └── skills/                    # 오케스트레이터 전용 스킬
│   │       └── rules-engine/
│   │           └── SKILL.md
│   ├── division-builder/
│   │   ├── AGENTS.md
│   │   ├── SOUL.md
│   │   └── skills/
│   │       ├── capability-analyzer/
│   │       ├── clawhub-searcher/
│   │       └── skill-generator/
│   └── division-b/                    # Division별 에이전트 그룹
│       ├── researcher/
│       │   ├── AGENTS.md
│       │   └── skills/
│       ├── writer/
│       │   ├── AGENTS.md
│       │   └── skills/
│       └── publisher/
│           ├── AGENTS.md
│           └── skills/
├── skills/                            # 공유 스킬 (모든 에이전트 접근)
│   ├── memory-manager/
│   │   └── SKILL.md
│   └── supabase-client/
│       └── SKILL.md
├── dashboard/                         # Next.js 대시보드
│   ├── package.json
│   ├── app/
│   │   ├── page.tsx                   # Command Center
│   │   ├── proposal/page.tsx          # Division 제안
│   │   ├── division/[id]/page.tsx     # Division Dashboard
│   │   ├── agent/[id]/page.tsx        # Agent Detail
│   │   ├── memory/page.tsx            # Institutional Memory
│   │   ├── strategy/page.tsx          # Strategy Layer
│   │   └── decisions/page.tsx         # Critical Decisions
│   └── components/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql     # 위 DDL
│       └── 002_rpc_functions.sql      # search_memories 등
└── scripts/
    ├── setup.sh                       # 초기 설정 자동화
    └── register-agents.sh             # OpenClaw 에이전트 등록
```

### 10.2 네이밍 규약

| 대상 | 규약 | 예시 |
|------|------|------|
| Division ID (DB) | UUID | auto |
| Division slug | kebab-case | `division-b` |
| Agent ID (OpenClaw) | kebab-case | `researcher-b` |
| Agent name (표시) | 자유 | "Division X Researcher" |
| 스킬 디렉토리 | kebab-case | `recipe-search/` |
| 스킬 이름 (SKILL.md) | kebab-case | `recipe-search` |
| DB 테이블 | snake_case | `agent_events` |
| DB 컬럼 | snake_case | `division_id` |
| TypeScript 변수 | camelCase | `divisionId` |
| 환경변수 | UPPER_SNAKE | `SUPABASE_URL` |
| 한국어 | 시스템 프롬프트, 사용자 대화 | — |
| 영어 | 코드, 변수명, 커밋 메시지 | — |

---

## 11. 환경변수

```bash
# .env (절대 커밋하지 않음)

# OpenAI
OPENAI_API_KEY=sk-...

# Gemini (이미지 생성)
GEMINI_API_KEY=...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...    # 서버 사이드에서만

# YouTube Data API
YOUTUBE_API_KEY=...

# Google Custom Search
GOOGLE_CSE_ID=...
GOOGLE_CSE_KEY=...

# OpenClaw
OPENCLAW_CONFIG_PATH=~/.openclaw/openclaw.json  # 기본값
```
