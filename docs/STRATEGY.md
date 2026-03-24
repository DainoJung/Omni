# Omni  — Strategic Pivot

> From internal infrastructure to product.
> From automation bundle to Agent OS.
> Author: Daino
> Date: 2026-03-23

---

## 1. Why: 왜 새로 시작하는가

### Omni v1의 한계

Omni v1은 "Daino의 사업을 자동화하는 시스템"이었다.
Division B(블로그)를 직접 세팅하면서 발견한 것:

- YouTube API 연결 → Daino가 직접 코드 작성
- Gemini 이미지 생성 연동 → Daino가 직접 코드 작성
- 포스트 템플릿 설계 → Daino가 직접 코드 작성
- DB 스키마 → Daino가 직접 마이그레이션 작성
- 대시보드 페이지 → Daino가 직접 프론트엔드 구현

에이전트가 "운영"은 자율로 하지만, "탄생"은 100% 수동이었다.
이건 OS가 아니라 프레임워크다. Rails나 Django와 다를 게 없다.

**Agent OS라는 이름을 달았지만, 실체는 "자동화 서비스 묶음"이었다.**

### 진짜 Agent OS란

OS 위에서 앱을 설치할 때 사용자가 커널 모듈을 짜지 않는다.
App Store에서 검색 → 설치 → 실행하면 끝이다.

Agent OS도 마찬가지여야 한다:
"유튜브 채널 운영해볼까" → 시스템이 스스로 필요한 역량 분석 → API 탐색/연결 → 에이전트 구성 → 파이프라인 설계 → 테스트 → 사람은 검토/조정만

**Division의 생성-운영-학습-진화 전체 라이프사이클이 시스템 안에서 자율적으로 동작해야 한다.**

### 왜 제품으로 가는가

Omni v1을 전면 교체해봤자 여전히 "Daino의 사업 시스템"이다.
youtube_trends.py, recipe_search.py, 쿠팡파트너스 배너 — 이건 특정 사업의 구현체이지 제품 코드가 아니다.

"사업을 돌리는 시스템"이 아니라 **"사업을 돌리는 시스템을 만드는 사업"**이 최종 Goal이다.
Daino의 사업(블로그, 구매대행)은 이 제품의 첫 번째 테스트 케이스다.

---

## 2. What: 무엇을 만드는가

### 제품 정의

OpenClaw 생태계 위에서 동작하는 **Agent OS for Autonomous Business**.

OpenClaw이 "개인 AI 비서"라면,
Omni 는 "AI가 사업을 운영하는 운영체제"다.

사용자가 "블로그 사업 해보자"라고 말하면,
시스템이 Division을 설계하고, 에이전트를 구성하고, 도구를 연결하고, 운영을 시작한다.
사람은 전략적 결정만 한다.

### 핵심 개념

**Division** — 독립적인 사업 단위. OS 위의 앱.
하나의 목표, N개의 에이전트, 파이프라인, 데이터, 규칙으로 구성된다.
추가되고, 수정되고, 진화하고, 제거될 수 있다.

**Agent** — Division 안의 직원. 각자 역할이 있다.
OpenClaw 인스턴스로 실행된다. 자율적으로 observe → think → act 루프를 돌린다.

**Meta Layer** — Division을 만드는 레이어. OS의 핵심.
Self-Awareness + Tool Discovery + Institutional Memory.

**Strategy Layer** — Division 간 시너지를 만드는 레이어.
크로스 Division 분석, 새 Division 제안, 저성과 Division 종료 제안.

### 핵심 원칙

**결정은 사람, 실행은 AI** — 전략부터 구축, 운영까지 모든 레벨에서.
**Human-on-the-Loop** — 에이전트는 자율 실행, 사람은 모니터링 + 예외 개입.
**프로세스는 적을수록 좋다** — 에이전트가 많다고 좋은 게 아니다.

---

## 3. How: OpenClaw 기반 아키텍처

### 왜 OpenClaw인가

OpenClaw는 GitHub 역사상 가장 빠르게 성장한 오픈소스 프로젝트다.
Omni 가 직접 만들어야 했던 것들을 이미 제공한다:

| Omni가 필요한 것 | OpenClaw이 제공하는 것 |
|---|---|
| 에이전트 런타임 | OpenClaw 에이전트 인스턴스 |
| 멀티 에이전트 | Gateway + 다중 에이전트 + sessions_send |
| Tool Discovery | ClawHub 3,000+ 스킬 레지스트리 + 벡터 검색 |
| 코드 자동 생성/실행 | LLM이 코드를 쓰고 실행하는 것이 기본 동작 |
| 외부 채널 통합 | Discord, WhatsApp, Telegram, Slack 등 20개+ |
| 스케줄링 | Cron (at/every/cron 표현식 + 격리 세션) |
| 브라우저 제어 | Chrome 인스턴스 직접 조작 |

### 아키텍처 구조

```
Omni  (Agent OS)
│
├── Meta Layer (Omni 고유)
│   ├── Self-Awareness — 시스템이 자신의 역량/한계를 인식
│   ├── Division Builder — 새 Division 자율 설계/구축
│   └── Institutional Memory — 운영 교훈의 구조화된 저장/참조
│
├── Business Logic Layer (Omni 고유)
│   ├── Division Manager — Division 라이프사이클 관리
│   ├── Rules Engine — 승인 흐름, 비용 임계치, 리스크 판단
│   ├── Strategy Layer — 크로스 Division 분석/제안
│   └── Metrics & Revenue — MAR 추적, 성과 분석
│
├── Agent Runtime (OpenClaw)
│   ├── Gateway — WebSocket 허브, 에이전트 라우팅
│   ├── Agent Instances — 각 에이전트 = OpenClaw 인스턴스
│   ├── ClawHub — 스킬 탐색/설치/실행
│   ├── Cron & Webhooks — 스케줄링, 외부 이벤트
│   └── Channels — Discord, WhatsApp, Telegram 등
│
├── Data Layer
│   ├── Supabase — PostgreSQL + Realtime + Storage
│   └── Institutional Memory Store — 구조화된 지식 DB
│
└── Interface Layer
    ├── Dashboard — 전체 Division 현황 모니터링
    └── Communication — 사람↔시스템 양방향 소통
```

### 멀티 에이전트 동작 방식

하나의 Gateway에 여러 OpenClaw 에이전트를 등록한다.
각 에이전트는 독립된 workspace, 메모리, 인증, 도구를 가진다.

```
Division B (블로그)
├── researcher_b (OpenClaw 인스턴스)
│   └── Skills: youtube-trends, recipe-search, keyword-analysis
├── writer_b (OpenClaw 인스턴스)
│   └── Skills: content-generation, image-gen, seo-optimization, google-indexing
│
에이전트 간 통신: sessions_send / sessions_spawn
스케줄링: OpenClaw Cron (researcher_b: 매 1시간, writer_b: 이벤트 트리거)
```

Orchestrator 패턴: 글로벌 오케스트레이터가 모든 Division의 워커들을 조율.
모델 분리: 오케스트레이터는 gpt-5 (복잡한 판단), 워커는 gpt-5-mini (빠른 실행).

### Meta Layer 상세

**Self-Awareness:**
시스템이 인식하는 것:
- 현재 연결된 API/스킬 목록과 상태
- 각 Division의 에이전트 구성, 파이프라인, 역량
- 시스템 리소스 (API 호출 한도, 비용, 에러율)

할 수 있는 판단:
- "이 작업을 수행할 도구가 있는가?"
- "없으면 ClawHub에서 찾을 수 있는가?"
- "ClawHub에도 없으면 직접 만들 수 있는가?"

**Division Builder:**
사람이 "유튜브 채널 Division 만들자"라고 결정하면:
1. 해당 사업에 필요한 역량 분석 (영상 기획, 스크립트, 썸네일, 업로드, 분석)
2. 각 역량에 필요한 도구를 ClawHub에서 탐색
3. ClawHub에 없는 도구 → 공식 API 문서 탐색 → 워크스페이스 스킬로 자동 생성 → 테스트
4. 에이전트 구성 제안 (몇 개, 각각 어떤 역할)
5. 파이프라인 설계 (에이전트 간 이벤트 흐름)
6. DB 스키마 초안
7. Institutional Memory 참조 (이전 Division에서 배운 것 적용)
8. 사람에게 설계안 제출 → 피드백 → 반영 → 구축

**Institutional Memory:**
Division을 만들고 운영하면서 쌓이는 구조화된 지식:

```yaml
아키텍처 결정:
  - "LLM 출력은 순수 데이터(JSON)로 받고, 렌더링은 템플릿에서 분리"
  - "이미지 생성은 rate limit 때문에 동시성 제한 필수"

실패한 접근:
  - "Google HTML 스크래핑은 깨지기 쉬움 → 공식 API 우선 탐색"
  - "에이전트 3개보다 2개가 나은 경우가 많음 → 단순하게 시작"

도메인 지식:
  - "한국 제휴마케팅은 고지 문구 법적 필수"
  - "블로그 SEO는 Schema.org 마크업이 Google 노출에 직접 영향"
```

**검색 메커니즘:**
Division Builder가 새 Division을 설계할 때, 관련 기억을 벡터 검색 + 태그 필터로 참조한다.
예: "블로그 Division 설계 중" → 태그 [블로그, SEO, 콘텐츠] 매칭 → 관련 교훈 자동 주입.
기억에는 신뢰도 점수가 있다: 성공 경험은 높고, 실패 경험은 "피해야 할 것"으로 분류된다.
오래된 기억이나 반복적으로 무시된 기억은 자동 감쇠(decay)된다.

사용자가 늘어나면 이 메모리가 폭발적으로 풍부해진다 → **경험 moat**.

### 알려진 리스크와 대응

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| OpenClaw 메모리 누수 (3일→28GB) | 높음 | 에이전트별 메모리 상한 + 자동 재시작 정책 |
| ClawHub 악성 스킬 | 높음 | 스킬 화이트리스트 + 샌드박스 실행 + 승인 흐름 |
| AI 출력 → 시스템 명령 검증 부재 | 높음 | Rules Engine에서 위험 작업 사전 차단 |
| OpenClaw 재단 이관 과도기 | 중간 | 핵심 의존성 인터페이스 수준으로 격리, 필요시 교체 가능한 구조 |
| 멀티 노드 분산 미지원 | 낮음 (초기) | 단일 서버로 시작, 스케일 필요 시 컨테이너 분리 |
| 월 비용 초과 | 높음 | 에이전트별 일/월 API 호출 한도 + 비용 대시보드 + 자동 일시정지 |
| 실패한 작업 방치 | 중간 | 실패 → 3회 재시도(backoff) → 실패 시 에스컬레이션 → 로그 보존 |
| ClawHub 스킬 버전 호환 | 중간 | 스킬 버전 고정(pin) + 업데이트 시 테스트 → 승인 후 적용 |

### 비용 모델 (예상)

```yaml
Phase 0-1 (개발 단계):
  OpenAI API: ~$50-100/월 (개발/테스트)
  Supabase: Free tier (500MB, 50K rows)
  서버: ~$20/월 (DigitalOcean 4GB droplet)
  합계: ~$70-120/월

Phase 2-3 (운영 시작):
  OpenAI API: ~$200-500/월 (Division 1-2개 운영)
  Gemini API: ~$30-50/월 (이미지 생성)
  Supabase: Pro $25/월
  서버: ~$40/월 (8GB)
  합계: ~$300-600/월

손익분기: MAR ₩500,000 이상 (약 $350)
```

---

## 4. Omni v1에서 가져가는 것

코드가 아니라 **설계 지식**을 가져간다.

### 가져가는 것 (설계/개념)

- **Division 추상화** — 사업 단위를 독립적 플러그인으로 보는 관점
- **HOTL 철학** — Human-on-the-Loop 운영 모델
- **"결정은 사람, 실행은 AI"** — 모든 레벨에서 적용
- **RulesEngine 개념** — 비용 임계치, 승인 흐름, 리스크 판단
- **에이전트 라이프사이클** — observe → think → decide → act → report → learn
- **Skills 자동 생성/진화** — 패턴 감지 → 스킬 생성 → 검증 → 실행 → 리팩터링
- **양방향 소통 모델** — 탑다운(사람→AI) + 바텀업(AI→사람)
- **Supabase 아키텍처** — Realtime 이벤트 버스, JSONB 유연한 스키마
- **Division B 운영 경험** — 블로그 자동화 파이프라인의 실전 교훈

### 버리는 것 (코드)

- core/agent.py — OpenClaw 에이전트 런타임으로 대체
- core/event_bus.py — Gateway + sessions_send로 대체
- core/skills.py — ClawHub + 워크스페이스 스킬로 대체
- agents/division_b/* — OpenClaw 에이전트로 재구현
- discord_handler.py — OpenClaw Discord 채널 내장
- main.py (스케줄러) — OpenClaw Cron으로 대체

### 참고용으로 보존하는 것

- core/youtube_trends.py — 블로그 Division 생성 시 로직 참고
- core/recipe_search.py — 3-tier fallback 패턴 참고
- core/post_template.py — 데이터→HTML 분리 패턴 참고
- core/image_gen.py — Gemini API 연동 + rate limiting 참고
- dashboard/ — UI/UX 설계 참고 (Palantir Foundry 스타일)
- supabase/migrations/ — 스키마 설계 참고

---

## 5. Zero to One 재평가

Omni v1에서 약했던 항목들이 에서 어떻게 바뀌는가:

### Engineering (10x) — 약→강

v1: Division 단위로는 경쟁자 많음 (블로그 자동화 도구 다수)
: "Division을 자율적으로 만드는 OS" — 기존에 없는 카테고리.
OpenClaw 단독은 "개인 비서", Omni 는 "사업 운영 OS". 차원이 다르다.

### Timing — 강 (유지)

AI 에이전트 시대 초입. OpenClaw 생태계 폭발적 성장 중.
1년 전이면 기술 부족, 1년 후면 경쟁자 과다. 지금이 적기.

### Monopoly — 약→중

v1: 고객이 Daino 1명. 시장 정의 불가.
: "OpenClaw 기반 Agent OS for 1인/소규모 창업자" — 정의 가능한 시장.
OpenClaw 사용자 중 "비서가 아니라 사업을 돌리고 싶은 사람"이 타겟.

### People — 중 (유지, 단 thesis가 자기검증됨)

1인 체제. 그러나 "AI가 팀을 대체한다"는 thesis의 증명이 곧 제품의 PMF 증명.

### Distribution — 약→중

v1: Google SEO 의존, 자체 채널 없음.
: OpenClaw 생태계가 유통 채널이 될 수 있다.
단, Omni를 ClawHub 스킬 패키지로 배포 가능한 형태로 설계해야 한다.
독립 설치형(standalone)만으로는 OpenClaw 생태계 내 발견이 어렵다.
"이 제품으로 실제로 월 ₩10M 벌고 있습니다" = 가장 강력한 마케팅.
**과제: Phase 3에서 ClawHub 배포 가능한 패키징 설계 필요.**

### Durability — 약→중

v1: 기술적 moat 없음. API 키만 있으면 누구나 복제 가능.
: Institutional Memory가 시간이 갈수록 쌓이면서 경험 moat 형성.
사용자가 늘수록 "어떤 사업에 어떤 Division 구성이 효과적인가"의 데이터가 축적.
후발주자가 이 데이터 없이 따라오기 어렵다.

### Secret — 강 (유지, 더 선명해짐)

v1: "AI가 사업을 운영할 수 있다"
: "AI가 사업을 운영하는 OS를 만들면, 사용자들의 경험이 쌓이면서 OS가 더 똑똑해지는 네트워크 효과가 생긴다"

---

## 6. 실행 로드맵

> 핵심: "Division B를 재구현한다"가 아니라 "시스템에게 사업을 제안하면 Division이 만들어진다"를 검증한다.

### Phase 0: OS 기반 (1~2주)

OpenClaw 위에서 "사업을 제안받고 Division을 만들어주는" 최소 구조를 세운다.

- OpenClaw 로컬 설치 및 Gateway 구성
- 멀티 에이전트 환경 셋업 (Orchestrator + Worker 패턴 검증)
- Supabase 프로젝트 세팅 (Division/Agent/Event/Memory 스키마)
- Division Builder 에이전트 — MVP
  - 사업 목표를 입력받으면 필요한 역량을 분석
  - ClawHub에서 관련 스킬 탐색
  - 에이전트 구성안 + 파이프라인 초안 생성
  - 사람에게 제출 → 피드백 → 구축
- Rules Engine 최소 버전 (Critical Decision 에스컬레이션)
- Self-Awareness 최소 버전 (연결된 스킬/API 목록 인식)
- **Go 조건**: "블로그 사업 하고 싶어"라고 입력하면, 시스템이 에이전트 구성안을 제안하는가?

### Phase 1: 첫 번째 Division 생성 (2~3주)

Daino가 시스템에게 "블로그 + 제휴마케팅 사업을 해보고 싶어"라고 제안한다.
시스템이 이를 Division으로 설계하고, 승인 후 구축하고, 운영을 시작한다.

- Division Builder가 블로그 Division 설계안 생성
- Daino가 설계안 검토 → 피드백 ("쿠팡파트너스 제휴 넣어줘", "레시피 중심으로")
- 시스템이 피드백 반영하여 Division 구축
- Division 운영 시작 (HOTL 모드)
- 대시보드에서 Division 현황 확인 가능
- **검증**: 코드 작성 없이 대화만으로 Division이 생성되고 운영되기 시작하는가?

### Phase 2: 학습과 두 번째 Division (3~4주)

첫 번째 Division 운영에서 배운 것을 Institutional Memory에 저장하고,
두 번째 Division을 제안해서 Memory가 실제로 적용되는지 검증한다.

- Institutional Memory 구현
- 두 번째 사업 제안: "구매대행 사업 해보고 싶어" 또는 "디지털 상품 판매"
- Division Builder가 Memory를 참조하여 설계
- 두 번째 Division 구축 + 운영 시작
- Strategy Layer 초안 — 두 Division 간 크로스 분석 시작
- **Go 조건**: 두 번째 Division Bootstrap Time < 첫 번째의 50%

### Phase 3: 제품화 (4~6주)

Daino가 아닌 사람이 쓸 수 있게 만든다.

- ClawHub 배포 가능한 스킬 패키지 형태 설계
- 온보딩 플로우 ("당신의 첫 Division을 만들어보세요")
- 문서화 (설치 가이드, "사업 제안하는 법", FAQ)
- 에러 핸들링 + 보안 레이어 (스킬 화이트리스트, 비용 상한)
- Division 종료(Sunset) 프로세스
- 외부 테스터 1~2명과 검증
- **검증**: Daino가 아닌 사람이 전혀 다른 Division을 성공적으로 생성하고 운영할 수 있는가?

### Phase 4: 성장 (ongoing)

- ClawHub에 Omni 스킬 패키지 등록
- 커뮤니티 빌딩 (Discord/GitHub)
- Institutional Memory 네트워크 효과 (다수 사용자의 교훈 축적)
- Daino의 Division들로 MAR 실증
- 비즈니스 모델 확정 (구독? 프리미엄? 수수료?)

### Go/No-Go 요약

| 전환 | Go 조건 | 핵심 질문 |
|------|---------|-----------|
| 0→1 | Builder가 사업 제안에 에이전트 구성안 제안 | "시스템이 사업을 이해하는가?" |
| 1→2 | 코드 없이 Division 생성 + 자율 운영 시작 | "진짜 OS처럼 동작하는가?" |
| 2→3 | 두 번째 Division이 첫 번째보다 빠르게 생성 | "학습이 작동하는가?" |
| 3→4 | 외부 사용자가 Division 생성 성공 | "제품인가?" |

---

## 7. North Star

### 제품 지표

**WAD (Weekly Active Divisions)** — 매주 활성 운영되는 Division 수.
Daino 본인의 Division + 외부 사용자의 Division 합산.

### 비즈니스 지표

**MAR (Monthly Autonomous Revenue)** — 월 자율 매출.
v1에서는 Daino의 매출만 해당. 에서는 두 가지:
1. Daino의 사업 매출 (dogfooding)
2. 제품 자체 매출 (구독료, 프리미엄 등 — 모델 미정)

### 기술 지표

**Division Bootstrap Time** — 새 Division을 0에서 운영 가능 상태까지 걸리는 시간.
v1: 수 주 (사람이 직접 코드 작성)
 목표: 수 시간 (시스템이 설계/구축, 사람은 검토/승인)

---

## 8. 기술 스택

```yaml
Agent Runtime: OpenClaw (Gateway + 멀티 에이전트)
Skills: ClawHub (managed) + Workspace Skills (custom)
Database: Supabase (PostgreSQL + Realtime + Storage)
LLM: OpenAI API (gpt-5 전략/설계, gpt-5-mini 실행)
Image: Gemini API (2.5 Flash Image)
Hosting: EC2 또는 DigitalOcean (OpenClaw Gateway), Vercel (Dashboard)
Domain: obscura.software (대시보드)
Communication: Discord (기본) + WhatsApp/Telegram (OpenClaw 채널 확장)
Memory: Supabase (Institutional Memory) + OpenClaw 세션 메모리
Dashboard: Next.js + Supabase Realtime + Palantir Foundry 스타일
Automation: OpenClaw Cron + Webhooks
```
