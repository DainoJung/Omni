# Omni  — Architecture

> OpenClaw 기반 Agent OS 상세 아키텍처

## 레이어 구조

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

Omni 고유 레이어(Meta + Business Logic)가 제품의 차별점.
OpenClaw 레이어(Agent Runtime)는 교체 가능한 인프라.

## 멀티 에이전트 동작

하나의 Gateway에 여러 OpenClaw 에이전트를 등록.
각 에이전트는 독립된 workspace, 메모리, 인증, 도구를 가짐.

```
Division X (예시)
├── researcher (OpenClaw 인스턴스)
│   └── Skills: trend-analysis, keyword-analysis, domain-search
├── writer (OpenClaw 인스턴스)
│   └── Skills: content-generation, image-gen, seo-optimization
│
에이전트 간 통신: sessions_send / sessions_spawn
스케줄링: OpenClaw Cron (researcher: 매 1시간, writer: 이벤트 트리거)
```

Orchestrator 패턴: Division마다 오케스트레이터 에이전트가 워커들을 조율.
모델 분리: 오케스트레이터는 gpt-5 (복잡한 판단), 워커는 gpt-5-mini (빠른 실행).

## Meta Layer

### Self-Awareness
- 현재 연결된 API/스킬 목록과 상태
- 각 Division의 에이전트 구성, 파이프라인, 역량
- 시스템 리소스 (API 호출 한도, 비용, 에러율)
- 판단: "도구 있는가?" → "ClawHub에서 찾을 수 있는가?" → "직접 만들 수 있는가?"

### Division Builder
1. 사업에 필요한 역량 분석
2. ClawHub에서 도구 탐색
3. 없으면 API 문서 탐색 → 워크스페이스 스킬 자동 생성 → 테스트
4. 에이전트 구성 제안
5. 파이프라인 설계
6. DB 스키마 초안
7. Institutional Memory 참조
8. 사람에게 설계안 제출 → 피드백 → 구축

### Institutional Memory
- 벡터 검색 + 태그 필터로 관련 기억 참조
- 신뢰도 점수: 성공 경험(높음), 실패 경험("피해야 할 것")
- 자동 감쇠(decay): 오래되거나 반복 무시된 기억

## 리스크와 대응

| 리스크 | 심각도 | 대응 |
|--------|--------|------|
| OpenClaw 메모리 누수 | 높음 | 에이전트별 메모리 상한 + 자동 재시작 |
| ClawHub 악성 스킬 | 높음 | 화이트리스트 + 샌드박스 + 승인 흐름 |
| AI 출력 검증 부재 | 높음 | Rules Engine 위험 작업 차단 |
| 월 비용 초과 | 높음 | 에이전트별 한도 + 자동 일시정지 |
| OpenClaw 재단 이관 | 중간 | 인터페이스 수준 격리 |
| 실패 작업 방치 | 중간 | 3회 retry → 에스컬레이션 → 로그 |
| 스킬 버전 호환 | 중간 | 버전 pin + 테스트 후 업데이트 |

## 비용 모델

```yaml
Phase 0-1: ~$70-120/월 (OpenAI $50-100, Supabase Free, 서버 $20)
Phase 2-3: ~$300-600/월 (OpenAI $200-500, Gemini $30-50, Supabase $25, 서버 $40)
손익분기: MAR ₩500,000 이상
```
