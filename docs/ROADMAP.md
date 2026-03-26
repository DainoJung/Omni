# Omni — Roadmap

> 핵심: "특정 Division을 재구현한다"가 아니라 "시스템에게 사업을 제안하면 Division이 만들어진다"를 검증한다.

## Phase 0: OS 기반 (1~2주) ✅ COMPLETE

OpenClaw 위에서 "사업을 제안받고 Division을 만들어주는" 최소 구조를 세운다.

- [x] OpenClaw 로컬 설치 및 Gateway 구성
  - Gateway 실행 중 (port 18789, LaunchAgent)
  - 인증 토큰 설정 완료
- [x] 멀티 에이전트 환경 셋업 (Orchestrator + Worker 패턴 검증)
  - Orchestrator: 의도 분류(4가지), STEP 마커, sessions_send 체이닝
  - Worker: JSON-only 응답 포맷 검증 완료
  - E2E 테스트 통과 (2026-03-26)
- [x] Supabase 프로젝트 세팅 (Division/Agent/Event/Memory 스키마)
  - 4개 마이그레이션 완료 (초기 스키마, RPC 함수, 비용 제한, pipeline_outputs)
  - 벡터 검색 (pgvector) + 텍스트 검색 fallback
  - 비용 초과 자동 일시정지 트리거
- [x] Division Builder 에이전트 — MVP
  - 사업 목표를 입력받으면 필요한 역량을 분석 ✅
  - ClawHub에서 관련 스킬 실제 탐색 (exec: openclaw skills search) ✅
  - 에이전트 구성안 + 파이프라인 초안 생성 (DivisionDesign JSON) ✅
  - 사람에게 제출 → 피드백 (최대 10회) → 승인 → 자동 구축 ✅
- [ ] Rules Engine 최소 버전 (Critical Decision 에스컬레이션)
  - DB 스키마 + SKILL.md 존재
  - 비용 초과 시 자동 에스컬레이션 (트리거 구현)
  - ⚠️ Orchestrator가 직접 critical_decisions INSERT 하는 코드는 미구현
- [ ] Self-Awareness 최소 버전 (연결된 스킬/API 목록 인식)
  - system_config 테이블 존재
  - ⚠️ 실제 추적 로직 미구현 (에이전트 sync API로 부분 대체)

**Go 조건**: 임의의 사업 아이디어를 입력하면, 시스템이 에이전트 구성안을 제안하는가? → **✅ Yes (2026-03-26 검증)**
**No-Go 시**: 해당 없음 — Go 달성.

### Phase 0에서 추가 구현된 것 (원래 로드맵 범위 밖)
- Dashboard (Next.js) 7페이지 + 11컴포넌트 + 8 API 라우트
- Chat Panel (SSE 스트리밍, STEP 마커 파싱, Agentic UI)
- Proposal 페이지 (제안 폼 + Design Review + 승인/피드백)
- Memory 관리 UI (추가/수정/삭제 + 벡터 검색)
- Agent 페이지 (스킬 동기화 + ClawHub 검색/설치 + suspicious 필터)
- Build 자동화 8단계 (DB → OpenClaw 등록 → AGENTS.md → 스킬 → Gateway → 스모크 테스트)
- Pipeline Output 저장/조회
- omni.sh CLI (12개 명령)

## Phase 1: 첫 번째 Division 생성 (2~3주) — 진행 중

Daino가 시스템에게 사업 아이디어를 제안한다.
시스템이 이를 Division으로 설계하고, 승인 후 구축하고, 운영을 시작한다.

- [x] Division Builder가 Division 설계안 생성
  - 필요 역량 분석 ✅
  - ClawHub 스킬 매칭 + 없는 것은 워크스페이스 스킬로 자동 생성 ✅
  - 에이전트 구성 제안 ✅
  - 파이프라인 설계 ✅
- [x] Daino가 설계안 검토 → 구체적인 요구사항 피드백
  - Design Review UI + 피드백 루프 (최대 10회) ✅
- [x] 시스템이 피드백 반영하여 Division 구축
  - 에이전트 등록 (OpenClaw 인스턴스) ✅
  - 스킬 설치/생성 ✅
  - DB 테이블 생성 ✅
  - ⚠️ Cron 스케줄링 미구현 (수동 파이프라인 실행만 가능)
- [x] Division 운영 시작 (HOTL 모드)
  - 운영 중 Division 4개 (B, D, 구매대행, 유튜브 요리)
  - Orchestrator가 파이프라인 체이닝 (sessions_send)
  - 워커 에이전트 JSON 응답 검증 완료
- [x] 대시보드에서 Division 현황 확인 가능
  - 메인 대시보드 + Division 상세 + Agent 상세
  - Realtime 이벤트/산출물 표시

**검증**:

1. "사업 제안 → Division 생성"의 end-to-end 플로우가 동작하는가? → ✅
2. 생성된 Division이 실제로 핵심 작업을 자율 수행하는가? → ✅ (researcher JSON 응답 검증)
3. 이 과정에서 Daino가 코드를 직접 짠 부분이 있는가? → ⚠️ 시스템 구축은 코드 필요, Division 생성/운영은 코드 불필요

**Go 조건**: 코드 작성 없이 대화만으로 Division이 생성되고 운영되기 시작 → **✅ 달성 (유튜브 요리 채널 Division으로 검증)**
**잔여 과제**:
- Cron 스케줄링 (자동 파이프라인 실행)
- Critical Decision 자동 생성 (Orchestrator → critical_decisions 테이블)
- 메트릭 자동 기록 (파이프라인 실행 후 api_cost 등)

## Phase 2: 학습과 두 번째 Division (3~4주)

첫 번째 Division 운영에서 배운 것을 Institutional Memory에 저장하고,
두 번째 Division을 제안해서 Memory가 실제로 적용되는지 검증한다.

- [x] Institutional Memory 구현
  - 벡터 검색 (pgvector + OpenAI embedding) + 텍스트 검색 fallback ✅
  - 태그 필터 + 신뢰도 점수 + decay 함수 ✅
  - Memory CRUD UI (추가/수정/삭제) ✅
  - ⚠️ Memory decay 자동 실행 (크론) 미구현
- [x] 두 번째 사업 제안: 첫 번째와 다른 도메인의 사업
  - Division B (블로그), D (디지털 상품), 구매대행, 유튜브 요리 — 4개 Division 운영 중
- [x] Division Builder가 Memory를 참조하여 설계
  - Proposal API가 현황 + Memory를 enriched context로 Builder에 전달 ✅
  - Builder가 기존 Division과의 시너지 분석 ✅
  - 교훈 반영 섹션 포함 ✅
- [x] 두 번째+ Division 구축 + 운영 시작
- [ ] Strategy Layer 초안 — Division 간 크로스 분석 시작
  - Dashboard에 /strategy 페이지 존재 (메트릭 표시)
  - ⚠️ 자동 분석/시너지 감지 엔진 미구현

**검증**:

1. 두 번째 Division 생성이 첫 번째보다 빠르고 안정적인가? → 검증 필요
2. Institutional Memory의 교훈이 실제로 반영되었는가? → ✅ (Builder가 교훈 참조 확인)
3. Strategy Layer가 두 Division 간 패턴을 감지하는가? → ❌ 미구현

**Go 조건**: 두 번째 Division Bootstrap Time < 첫 번째의 50% → 측정 필요
**잔여 과제**:
- Strategy Layer 분석 엔진
- Memory decay 크론
- Bootstrap Time 측정/비교

## Phase 3: 제품화 (4~6주)

Daino가 아닌 사람이 쓸 수 있게 만든다.

- [ ] ClawHub 배포 가능한 스킬 패키지 형태 설계
- [ ] 온보딩 플로우 ("당신의 첫 Division을 만들어보세요")
- [x] 에러 핸들링 + 보안 레이어
  - 스킬 화이트리스트 (skill_whitelist 테이블) ✅
  - 비용 상한 자동 일시정지 (트리거) ✅
  - ClawHub suspicious 스킬 필터링 ✅
- [x] Division 종료(Sunset) 프로세스
  - sunset 트리거 (에이전트 자동 비활성화) ✅
  - Dashboard에서 pause/resume/sunset ✅
- [ ] 문서화 (설치 가이드, "사업 제안하는 법", FAQ)
- [ ] 외부 테스터 1~2명과 검증

**검증**: Daino가 아닌 사람이 전혀 다른 Division을 성공적으로 생성하고 운영할 수 있는가?

## Phase 4: 성장 (ongoing)

- [ ] ClawHub에 Omni 스킬 패키지 등록
- [ ] 커뮤니티 빌딩 (Discord/GitHub)
- [ ] Institutional Memory 네트워크 효과 (다수 사용자의 교훈 축적)
- [ ] Daino의 Division들로 MAR 실증
- [ ] 비즈니스 모델 확정 (구독? 프리미엄? 수수료?)

## 타임라인

```
Phase 0 ██████ Phase 1 ██████████ Phase 2 ████████████ Phase 3 ──────────────── Phase 4
 DONE ✅       ~80% 완료          ~70% 완료           시작 전                    시작 전
 OS 기반       첫+ Division       학습 + Memory        제품화                     성장
 Builder MVP   자동 구축           Memory 검증          외부 사용자               커뮤니티
```

## Go/No-Go 요약

| 전환 | Go 조건                                    | 상태 | 핵심 질문                     |
| ---- | ------------------------------------------ | ---- | ----------------------------- |
| 0→1 | Builder가 사업 제안에 에이전트 구성안 제안 | ✅ Go | "시스템이 사업을 이해하는가?" |
| 1→2 | 코드 없이 Division 생성 + 자율 운영 시작   | ✅ Go | "진짜 OS처럼 동작하는가?"     |
| 2→3 | 두 번째 Division이 첫 번째보다 빠르게 생성 | 측정 필요 | "학습이 작동하는가?"          |
| 3→4 | 외부 사용자가 Division 생성 성공           | 미시작 | "제품인가?"                   |

## 전체 잔여 과제 (우선순위 순)

1. **Cron 스케줄링** — 파이프라인 자동 실행 (Phase 1 잔여)
2. **Critical Decision 자동 생성** — Orchestrator → DB INSERT (Phase 0 잔여)
3. **메트릭 자동 기록** — 파이프라인 실행 후 비용/성과 기록 (Phase 1 잔여)
4. **Strategy Layer 분석 엔진** — Division 간 시너지 감지 (Phase 2 잔여)
5. **Memory decay 크론** — 월별 자동 실행 (Phase 2 잔여)
6. **Self-Awareness 추적** — API 상태/quota 자동 모니터링 (Phase 0 잔여)
