# Omni  — Agent OS for Autonomous Business

## 프로젝트 요약

Omni 는 OpenClaw 기반 Agent OS다.
"사업을 돌리는 시스템을 만드는 사업" — 제품이다.

사용자가 "블로그 사업 해보자"라고 말하면,
시스템이 Division(사업부)을 설계하고, 에이전트를 구성하고, 도구를 연결하고, 운영을 시작한다.
사람은 전략적 결정만 한다.

## 핵심 개념

- **Division**: 독립적인 사업 단위. OS 위의 앱. N개의 에이전트, 파이프라인, 데이터, 규칙으로 구성.
- **Agent**: Division 안의 직원. 각각 OpenClaw 인스턴스로 실행. 자율적으로 observe → think → act.
- **Meta Layer**: Division을 자율적으로 만드는 레이어. Self-Awareness + Tool Discovery(ClawHub) + Institutional Memory.
- **Strategy Layer**: Division 간 크로스 분석, 시너지 발굴, 새 Division 제안.

## 핵심 원칙

1. **결정은 사람, 실행은 AI** — 전략~구축~운영 모든 레벨에서.
2. **Human-on-the-Loop (HOTL)** — 에이전트 자율 실행, 사람은 모니터링 + Critical Decision만 개입.
3. **프로세스는 적을수록 좋다** — 에이전트가 많다고 좋은 게 아니다. 단순하게.
4. **Division의 전체 라이프사이클이 시스템 안에서 동작** — 제안→설계→구축→운영→진화→종료.

## 아키텍처

```
Omni  (Agent OS)
├── Meta Layer (Omni 고유) — Self-Awareness, Division Builder, Institutional Memory
├── Business Logic (Omni 고유) — Division Manager, Rules Engine, Strategy Layer, Metrics
├── Agent Runtime (OpenClaw) — Gateway, Agent Instances, ClawHub, Cron, Channels
├── Data (Supabase) — PostgreSQL + Realtime + Storage + Institutional Memory Store
└── Interface — Dashboard (Next.js), Communication (Discord + 확장)
```

## 기술 스택

- **Agent Runtime**: OpenClaw (Gateway + 멀티 에이전트 + ClawHub)
- **Database**: Supabase (PostgreSQL + Realtime + Storage)
- **LLM**: OpenAI API (gpt-5: 전략/설계, gpt-5-mini: 실행)
- **Image**: Gemini API (2.5 Flash Image)
- **Dashboard**: Next.js + Supabase Realtime
- **Hosting**: DigitalOcean (OpenClaw Gateway), Vercel (Dashboard)
- **Automation**: OpenClaw Cron + Webhooks

## 코드 컨벤션

- OpenClaw 스킬은 `skills/` 디렉토리에 SKILL.md 형식으로 작성
- Supabase 마이그레이션은 `supabase/migrations/` 에 순번 파일로
- 에이전트별 워크스페이스 스킬은 `agents/{division}_{role}/skills/`에 배치
- TypeScript (Dashboard), Python (커스텀 도구/스크립트)
- 한국어 시스템 프롬프트, 영어 코드/변수명

## Critical Decision 기준 (Rules Engine)

아래 조건에 해당하면 사람에게 에스컬레이션:
- 비용 발생 (일 ₩50,000 초과)
- 외부 커뮤니케이션 (고객/외주 메시지 발송)
- 비가역적 작업 (삭제, 계정 변경, 대량 작업)
- 에이전트 확신도 낮은 판단
- 새 Division 생성/제거

## 현재 Phase

Phase 0: OS 기반 (1~2주)
OpenClaw 위에서 "사업을 제안받고 Division을 만들어주는" 최소 구조를 세운다.

- [ ] OpenClaw 로컬 설치 및 Gateway 구성
- [ ] 멀티 에이전트 환경 셋업 (Orchestrator + Worker 패턴 검증)
- [ ] Supabase 프로젝트 세팅 (Division/Agent/Event/Memory 스키마)
- [ ] Division Builder 에이전트 — MVP
  - 사업 목표를 입력받으면 필요한 역량을 분석
  - ClawHub에서 관련 스킬 탐색
  - 에이전트 구성안 + 파이프라인 초안 생성
  - 사람에게 제출 → 피드백 → 구축
- [ ] Rules Engine 최소 버전 (Critical Decision 에스컬레이션)
- [ ] Self-Awareness 최소 버전 (연결된 스킬/API 목록 인식)

**Go 조건**: "블로그 사업 하고 싶어"라고 입력하면, 시스템이 에이전트 구성안을 제안하는가?

## 참고 문서

- `docs/STRATEGY.md` — 전체 전략 (Why → What → How)
- `docs/ARCHITECTURE.md` — 상세 아키텍처 + Meta Layer + 리스크 + 비용
- `docs/ROADMAP.md` — Phase별 실행 계획 + Go/No-Go 기준
- `docs/TECH_SPEC.md` — 구현 명세 (OpenClaw 설정, Supabase DDL, 메시지 포맷, 디렉토리 규약)
- `docs/DIVISION_BUILDER_SPEC.md` — Division Builder 상세 (프롬프트, 입출력 스키마, 구축 절차)
- `docs/ZERO_TO_ONE.md` — Peter Thiel 프레임워크 평가
- `docs/V1_LESSONS.md` — Omni v1에서 배운 교훈 (참고용)

## Omni v1 참고

v1 코드는 제품 코드로 가져오지 않는다. 설계 지식만 참조:
- Division 추상화, HOTL 철학, RulesEngine 개념
- 에이전트 라이프사이클 (observe→think→decide→act→report→learn)
- LLM 출력은 순수 데이터(JSON)로 받고 렌더링은 분리
- 이미지 생성은 rate limit 때문에 동시성 제한 필수
- Google HTML 스크래핑은 깨지기 쉬움 → 공식 API 우선
- 에이전트 수는 적을수록 좋음 → 단순하게 시작
- 한국 제휴마케팅은 쿠팡파트너스 고지 문구 법적 필수
