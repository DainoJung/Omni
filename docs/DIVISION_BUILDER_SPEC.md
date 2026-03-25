# Omni  — Division Builder Specification

> Division Builder는 Omni OS의 핵심 에이전트.
> "사업을 제안하면 Division을 설계하고 구축한다."
> 이 문서는 Builder의 입출력, 로직, 프롬프트, 데이터 구조를 정의한다.

---

## 1. 역할과 범위

Division Builder는 OpenClaw 에이전트(`division-builder`)로 실행된다.

**하는 것:**
- 사업 제안을 받아 필요 역량을 분석
- ClawHub에서 관련 스킬 탐색
- 없는 스킬은 워크스페이스 스킬로 자동 생성
- 에이전트 구성안 + 파이프라인 설계안 생성
- Institutional Memory에서 관련 교훈 참조
- 사람에게 설계안 제출 → 피드백 수렴 → 반영
- 승인 후 Division 구축 (에이전트 등록, 스킬 설치, DB 생성, Cron 등록)

**하지 않는 것:**
- Division 운영 (운영은 Division 내 에이전트들이 담당)
- 직접 비즈니스 결정 (사람이 승인)
- 다른 Division의 에이전트 직접 조작 (오케스트레이터를 통해)

---

## 2. 전체 플로우

```
사용자 ─── "[사업 아이디어]" ──→ 오케스트레이터
                                         │
                                    sessions_send
                                         │
                                         ▼
                                  Division Builder
                                         │
                        ┌────────────────┼────────────────┐
                        ▼                ▼                ▼
                  역량 분석         Memory 참조       ClawHub 탐색
                        │                │                │
                        └────────┬───────┘                │
                                 ▼                        │
                           설계안 생성 ←──────────────────┘
                                 │
                                 ▼
                    ┌─── 설계안 제출 (Critical Decision) ───┐
                    │                                       │
                    ▼                                       ▼
              사람: 피드백                             사람: 승인
              "[피드백 예시]"                              │
                    │                                       ▼
                    └──→ Builder 반영                  Division 구축
                         └──→ 재제출                       │
                                                    ┌──────┼──────┐
                                                    ▼      ▼      ▼
                                              에이전트   스킬    DB/Cron
                                               등록    설치/생성  설정
                                                    │      │      │
                                                    └──────┼──────┘
                                                           ▼
                                                    운영 시작 (HOTL)
```

---

## 3. 입력: 사업 제안

### 3.1 입력 형태

사용자의 자연어 텍스트. 구조화되지 않아도 됨.

**예시:**
- "유튜브 채널 운영"
- "온라인 교육 사업"
- "커머스 자동화"
- "해외 상품 구매대행 사업"
- "디지털 상품 판매"

### 3.2 최소 정보

Builder는 아래 정보가 부족하면 사용자에게 질문:

| 정보 | 필수 | 질문 예시 |
|------|------|-----------|
| 사업 유형/목표 | 필수 | "어떤 사업인가요?" |
| 타겟 시장/고객 | 권장 | "주 고객이 누구인가요? (한국? 글로벌?)" |
| 수익 모델 | 권장 | "어떻게 돈을 벌 계획인가요?" |
| 기존 자산 | 선택 | "이미 가지고 있는 계정이나 도구가 있나요?" |
| 예산 제한 | 선택 | "월 예산 제한이 있나요?" |

---

## 4. 역량 분석 (Capability Analysis)

### 4.1 프로세스

Builder가 사업 제안을 받으면:
1. 사업 목표를 기능 역량(capability)으로 분해
2. 각 역량에 필요한 도구(tool/skill)를 식별
3. ClawHub에서 해당 스킬 검색
4. 매칭 결과를 정리

### 4.2 역량 분석 프롬프트

```markdown
## 역할
당신은 Omni OS의 Division Builder입니다.
사용자가 제안한 사업을 분석하여 필요한 역량(capability)을 식별합니다.

## 입력
사업 제안: {{proposal_text}}

## 작업
1. 이 사업을 운영하려면 어떤 기능적 역량이 필요한지 나열하세요.
   각 역량은 구체적이고 자동화 가능한 단위여야 합니다.
   (예: "트렌드 탐색", "콘텐츠 작성", "이미지 생성" — O)
   (예: "마케팅", "영업" — X, 너무 추상적)

2. 각 역량에 대해:
   - 어떤 외부 API/서비스가 필요한지
   - 주기 (실시간? 매 시간? 매일?)
   - 우선순위 (core: 없으면 사업 불가 / nice-to-have: 있으면 좋음)

3. 역량 간 의존관계를 식별하세요.
   (예: "콘텐츠 작성"은 "트렌드 탐색" 결과에 의존)

## 출력 포맷
JSON으로 출력하세요. (아래 스키마)
```

### 4.3 역량 분석 출력 스키마

```typescript
interface CapabilityAnalysis {
  businessSummary: string;           // 사업 한줄 요약
  targetMarket: string;              // 타겟 시장
  revenueModel: string;             // 수익 모델

  capabilities: Capability[];

  dependencies: Dependency[];        // 역량 간 의존관계
}

interface Capability {
  id: string;                        // "trend-research"
  name: string;                      // "트렌드 탐색"
  description: string;               // 상세 설명
  priority: "core" | "nice-to-have";
  frequency: string;                 // "every 2 hours" | "event-driven" | "daily"
  requiredApis: string[];           // ["YouTube Data API v3", "Google Trends"]
  suggestedSkillQuery: string;       // ClawHub 검색 쿼리
}

interface Dependency {
  from: string;                      // capability id
  to: string;                        // capability id
  dataFlow: string;                  // "topics + keywords"
}
```

---

## 5. ClawHub 탐색 및 스킬 매칭

### 5.1 프로세스

각 capability에 대해:
1. `suggestedSkillQuery`로 ClawHub 검색
2. 결과에서 가장 적합한 스킬 선택
3. 매칭되지 않는 역량 → 워크스페이스 스킬 자동 생성 대상으로 표시

### 5.2 스킬 매칭 결과 스키마

```typescript
interface SkillMatch {
  capabilityId: string;              // 매칭된 역량 ID
  status: "matched" | "auto-generate" | "manual-required";

  // matched인 경우
  clawhubSkill?: {
    name: string;                    // ClawHub 스킬 이름
    version: string;
    description: string;
    rating: number;                  // ClawHub 평점
    downloads: number;
    requiredEnv: string[];           // 필요한 환경변수
  };

  // auto-generate인 경우
  generationPlan?: {
    skillName: string;               // 생성할 스킬 이름
    apiDocs: string;                 // 참조할 API 문서 URL
    approach: string;                // 생성 접근 방식 설명
    estimatedEffort: string;         // "simple" | "moderate" | "complex"
  };
}
```

### 5.3 스킬 자동 생성

Builder가 워크스페이스 스킬을 직접 생성하는 경우:

1. 공식 API 문서를 WebFetch로 참조
2. SKILL.md + 실행 스크립트 생성
3. 생성된 스킬을 테스트 (dry-run)
4. 테스트 통과 시 스킬 디렉토리에 배치
5. 실패 시 에러 로그와 함께 사람에게 에스컬레이션

**스킬 자동 생성 프롬프트:**

```markdown
## 역할
워크스페이스 스킬을 생성합니다.

## 입력
- 역량: {{capability.name}}
- 설명: {{capability.description}}
- API: {{capability.requiredApis}}
- 참조: {{generationPlan.apiDocs}}

## 규칙
1. SKILL.md는 ClawHub 포맷을 따릅니다 (YAML frontmatter + 마크다운 지시사항)
2. 스크립트는 scripts/ 디렉토리에 배치
3. 외부 API 호출 시 반드시 rate limiting 적용
4. 에러는 명시적으로 반환 (빈 결과 반환 금지)
5. 환경변수로 인증 (하드코딩 금지)

## Institutional Memory 참조
{{relevant_memories}}

## 출력
1. SKILL.md 전체 내용
2. scripts/ 하위 파일들
3. 필요한 환경변수 목록
```

---

## 6. 설계안 (Division Design Document)

### 6.1 설계안 스키마

Builder가 분석 완료 후 생성하는 구조화된 설계안:

```typescript
interface DivisionDesign {
  // 기본 정보
  meta: {
    name: string;                    // "Division X — [사업명]"
    slug: string;                    // "division-b"
    description: string;
    proposalText: string;            // 원본 제안
    version: number;                 // 피드백 반영 시 증가
    createdAt: string;               // ISO 8601
  };

  // 역량 분석 결과
  analysis: CapabilityAnalysis;

  // 스킬 매칭 결과
  skillMatches: SkillMatch[];

  // 에이전트 구성
  agents: AgentDesign[];

  // 파이프라인
  pipeline: PipelineDesign;

  // DB 스키마 초안
  database: {
    tables: string[];                // 필요한 추가 테이블 설명
    customColumns: object;           // divisions.config에 넣을 값
  };

  // 스케줄링
  cronJobs: CronJobDesign[];

  // 비용 예측
  costEstimate: {
    monthlyApiCost: string;          // "$50-100"
    breakdown: object;
  };

  // Memory에서 참조한 교훈
  appliedMemories: {
    memoryId: string;
    content: string;
    howApplied: string;              // 이 설계에 어떻게 반영했는지
  }[];
}

interface AgentDesign {
  id: string;                        // OpenClaw agent ID
  name: string;
  role: string;                      // 역할 설명
  model: "gpt-5" | "gpt-5-mini";
  capabilities: string[];            // 담당 역량 ID 목록
  skills: {
    name: string;
    source: "clawhub" | "workspace-generate" | "workspace-existing";
  }[];
  schedule: {
    type: "cron" | "event-driven";
    expression?: string;             // cron인 경우
    trigger?: string;                // event인 경우 트리거 설명
  };
}

interface PipelineDesign {
  steps: {
    order: number;
    fromAgent: string;
    toAgent: string;
    messageType: string;
    dataFlow: string;                // 전달되는 데이터 설명
  }[];
  diagram: string;                   // ASCII 다이어그램
}

interface CronJobDesign {
  agentId: string;
  name: string;
  schedule: {
    kind: "every" | "cron";
    everyMs?: number;
    cron?: string;
    tz?: string;
  };
  payload: {
    kind: "agentTurn";
    message: string;
  };
}
```

### 6.2 설계안 제출

Builder는 설계안을 두 곳에 저장:
1. **Supabase**: `divisions.design_doc` (JSONB) — 프로그래밍적 참조용
2. **사람에게**: 읽기 쉬운 형태로 변환하여 Critical Decision으로 제출

**사람에게 보여주는 포맷:**

```
📋 Division 설계안 v1

사업: [사업명] ([핵심 도메인])

━━ 역량 분석 ━━
✅ [역량 1]      → [스킬명] (ClawHub)
✅ [역량 2]      → [스킬명] (ClawHub)
🔨 [역량 3]      → [스킬명] (자동 생성)
✅ [역량 4]      → [스킬명] (ClawHub)
🔨 [역량 5]      → [스킬명] (자동 생성)

━━ 에이전트 구성 ━━
A1. researcher (gpt-5-mini, 매 N시간)
    → [담당 역량 목록]

A2. writer (gpt-5, 이벤트 트리거)
    → [담당 역량 목록]

A3. publisher (gpt-5-mini, 이벤트 트리거)
    → [담당 역량 목록]

━━ 파이프라인 ━━
researcher → [데이터] → writer → [결과물] → publisher → published

━━ 적용된 교훈 ━━
📎 [Memory에서 참조한 교훈] → [해당 에이전트에 반영 방식]

━━ 예상 비용 ━━
$XX-XX/월 (API별 상세 내역)

[승인] [피드백 보내기]
```

---

## 7. 피드백 루프

### 7.1 프로세스

```
설계안 v1 제출
     ↓
사람: "[사용자 피드백 예시]"
     ↓
Builder: 피드백 분석
  → 관련 에이전트 스킬에 요청 사항 반영
  → 설계안 업데이트
     ↓
설계안  제출 (version 증가, 변경 사항 하이라이트)
     ↓
사람: "승인"
     ↓
구축 시작
```

### 7.2 피드백 분석 프롬프트

```markdown
## 역할
Division 설계안에 대한 사용자 피드백을 반영합니다.

## 현재 설계안
{{current_design_json}}

## 사용자 피드백
{{feedback_text}}

## 작업
1. 피드백을 구체적인 변경 사항으로 분해
2. 각 변경이 설계안의 어디에 영향을 주는지 식별
   - 새 역량 추가?
   - 기존 에이전트 스킬 변경?
   - 파이프라인 수정?
   - 새 에이전트 필요?
3. 변경 적용 후 설계안 v(N+1) 생성
4. 변경 요약을 사람이 읽기 쉬운 형태로

## 출력
1. 변경된 DivisionDesign JSON (version 증가)
2. 변경 요약 텍스트
```

### 7.3 최대 반복 횟수

피드백 루프는 최대 10회. 10회 초과 시 Builder가 경고:
"설계 반복이 10회를 넘었습니다. 현재 안으로 시작하고 운영하면서 개선하는 게 효율적일 수 있습니다."

---

## 8. Division 구축 (Build Phase)

### 8.1 구축 순서

승인 후 Builder가 실행하는 단계:

```
1. Supabase 설정
   ├── divisions 행 INSERT (status: 'building')
   ├── agents 행 INSERT (status: 'inactive')
   ├── agent_skills 행 INSERT
   └── division_pipelines 행 INSERT

2. 스킬 설치/생성
   ├── ClawHub 스킬 설치 (openclaw skills install ...)
   └── 워크스페이스 스킬 생성 (SKILL.md + scripts/)

3. 에이전트 등록
   ├── openclaw agents add <agent-id>
   ├── 워크스페이스 디렉토리 생성
   ├── AGENTS.md 작성 (시스템 프롬프트)
   └── SOUL.md 작성 (성격/원칙)

4. openclaw.json 업데이트
   ├── agents.list에 새 에이전트 추가
   └── bindings 필요 시 추가

5. Cron 잡 등록
   └── jobs.json에 스케줄 추가

6. Gateway 재시작
   └── openclaw gateway restart

7. 스모크 테스트
   ├── 각 에이전트에게 테스트 메시지 전송
   ├── 파이프라인 1회 실행
   └── 결과 검증

8. 활성화
   ├── divisions.status → 'operating'
   ├── agents.status → 'active'
   └── Cron 잡 enabled: true
```

### 8.2 구축 진행 보고

각 단계 완료/실패 시 `agent_events`에 기록하고,
Supabase Realtime을 통해 대시보드에 실시간 표시.

```typescript
// 구축 진행 이벤트
interface BuildProgressEvent {
  event_type: "build_progress";
  payload: {
    divisionId: string;
    step: number;          // 1-8
    stepName: string;
    status: "started" | "completed" | "failed";
    detail?: string;       // 실패 시 에러 메시지
    progress: number;      // 0-100 (전체 진행률)
  };
}
```

### 8.3 실패 복구

구축 중 실패 시:
1. 실패 단계 로그 기록
2. 3회 재시도 (exponential backoff)
3. 여전히 실패 → Critical Decision으로 에스컬레이션
4. 사람이 "건너뛰기" 또는 "수동 해결 후 계속" 선택 가능
5. 전체 중단 시 → 이미 생성된 리소스 정리 (rollback)

---

## 9. AGENTS.md 템플릿

Builder가 각 에이전트의 시스템 프롬프트를 자동 생성할 때 사용하는 템플릿:

### 9.1 오케스트레이터

```markdown
# Omni Orchestrator

## 역할
Omni OS의 메인 오케스트레이터. 사용자와 직접 대화하고,
Division들을 조율하며, Critical Decision을 에스컬레이션한다.

## 관리하는 Division
{{division_list}}

## 규칙
1. 사용자의 사업 제안은 Division Builder에게 전달 (sessions_send)
2. Critical Decision 기준에 해당하는 작업은 반드시 사람에게 확인
3. 일일 리포트는 매일 09:00 KST에 Discord로 전송
4. 에이전트 에러가 3회 연속이면 해당 에이전트 일시정지 후 보고

## 사용 가능한 도구
- sessions_send: Division 에이전트에게 메시지 전달
- sessions_list: 활성 세션 조회
- sessions_history: 세션 히스토리 조회
- supabase-client: DB 조회/업데이트
- rules-engine: 액션 승인 여부 판단
```

### 9.2 Division 워커 (템플릿)

```markdown
# {{agent_name}}

## 역할
{{division_name}}의 {{role_description}}.

## 담당 역량
{{capabilities_list}}

## 스킬
{{skills_list}}

## 파이프라인
- 입력: {{input_description}} (from {{source_agent}})
- 처리: {{processing_steps}}
- 출력: {{output_description}} (to {{target_agent}})

## 규칙
1. 출력은 반드시 JSON 포맷 (AgentMessage 스키마)
2. 외부 API 호출 시 rate limiting 준수
3. 에러 발생 시 즉시 보고 (error 메시지 타입)
4. 확신도가 0.7 미만이면 에스컬레이션
5. Institutional Memory에 기록할 만한 교훈 발견 시 memory_save 메시지 전송

## Institutional Memory 참조
{{relevant_memories}}
```

---

## 10. Institutional Memory 연동

### 10.1 Builder가 Memory를 참조하는 시점

1. **역량 분석 시**: 해당 사업 도메인 관련 교훈 검색
2. **스킬 매칭 시**: 이전에 실패한 접근 회피
3. **에이전트 구성 시**: 아키텍처 결정 교훈 적용
4. **스킬 자동 생성 시**: 도메인 지식 참조

### 10.2 Memory 검색 호출

```typescript
// Builder가 Supabase RPC를 통해 Memory 검색
const relevantMemories = await supabase.rpc('search_memories', {
  query_embedding: await embed(
    `${proposal.businessSummary} ${proposal.capabilities.map(c => c.name).join(' ')}`
  ),
  match_threshold: 0.7,
  match_count: 10,
  filter_tags: extractTags(proposal),  // ["도메인", "키워드", "태그"] 등
});
```

### 10.3 Memory 적용 기록

Builder가 설계안에 Memory를 적용한 경우, 반드시 `appliedMemories`에 기록.
이후 해당 Memory의 `times_referenced`를 +1 증가.

적용하지 않은 경우 (관련성 낮다고 판단), `times_ignored`를 +1 증가.
→ ignored가 많아지면 confidence가 자동 감쇠.

### 10.4 Memory 감쇠 (Decay) 정책

```sql
-- 월 1회 실행하는 decay 함수
CREATE OR REPLACE FUNCTION decay_memories()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- 3개월 이상 참조되지 않은 메모리: confidence 10% 감소
  UPDATE memories
  SET
    confidence = GREATEST(confidence * 0.9, 0.1),
    decayed_at = now()
  WHERE
    updated_at < now() - INTERVAL '3 months'
    AND times_referenced = 0;

  -- 무시 비율이 참조 비율보다 높은 메모리: confidence 감소
  UPDATE memories
  SET
    confidence = GREATEST(confidence * 0.85, 0.1),
    decayed_at = now()
  WHERE
    times_ignored > times_referenced * 2
    AND times_ignored > 5;

  -- confidence 0.1 이하인 메모리: 아카이브 (삭제하지 않음)
  -- → 검색 결과에서 자동 제외됨 (search_memories의 WHERE confidence > 0.3)
END;
$$;
```

---

## 11. Phase 0 MVP 범위

Phase 0에서 Builder가 갖춰야 할 최소 기능:

| 기능 | Phase 0 범위 | Phase 1+ 확장 |
|------|-------------|---------------|
| 역량 분석 | LLM 프롬프트로 분석 | 사업 유형별 템플릿 |
| ClawHub 탐색 | `openclaw skills search` 호출 | 자동 평가/선택 |
| 스킬 자동 생성 | 단순 SKILL.md 생성 | 스크립트 포함, 테스트 자동화 |
| 에이전트 구성 | 2~3개 에이전트 제안 | 최적 구성 추천 (Memory 기반) |
| 파이프라인 설계 | 직선형 파이프라인 | 분기/병합 지원 |
| Memory 참조 | 수동 주입 (하드코딩) | 벡터 검색 자동 |
| 피드백 루프 | 1회 피드백 → 반영 | 다중 피드백, diff 표시 |
| 구축 자동화 | 에이전트 등록 + 스킬 설치 | 전체 자동화 + 스모크 테스트 |
| 설계안 포맷 | 텍스트 (사람이 읽는 용) | JSON + 시각화 (대시보드) |

### Phase 0 Go 조건

임의의 사업 아이디어를 입력했을 때:
1. Builder가 역량 분석 결과를 보여주는가? ✅
2. ClawHub에서 관련 스킬을 찾아오는가? ✅
3. 에이전트 구성안을 제안하는가? ✅
4. 파이프라인 다이어그램을 보여주는가? ✅

→ 이 4가지가 동작하면 Phase 1 진입.
