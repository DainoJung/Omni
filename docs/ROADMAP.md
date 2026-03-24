# Omni — Roadmap

> 핵심: "Division B를 재구현한다"가 아니라 "시스템에게 사업을 제안하면 Division이 만들어진다"를 검증한다.

## Phase 0: OS 기반 (1~2주)

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
**No-Go 시**: Division Builder 스코프를 축소하되, 수동 구축으로 후퇴하지 않는다.

## Phase 1: 첫 번째 Division 생성 (2~3주)

Daino가 시스템에게 "블로그 + 제휴마케팅 사업을 해보고 싶어"라고 제안한다.
시스템이 이를 Division으로 설계하고, 승인 후 구축하고, 운영을 시작한다.

- [ ] Division Builder가 블로그 Division 설계안 생성
  - 필요 역량: 트렌드 탐색, 키워드 분석, 콘텐츠 생성, 이미지 생성, SEO, 발행
  - ClawHub 스킬 매칭 + 없는 것은 워크스페이스 스킬로 자동 생성
  - 에이전트 구성 제안 (researcher + writer? 아니면 다른 구조?)
  - 파이프라인 설계
- [ ] Daino가 설계안 검토 → 피드백 ("쿠팡파트너스 제휴 넣어줘", "레시피 중심으로")
- [ ] 시스템이 피드백 반영하여 Division 구축
  - 에이전트 등록 (OpenClaw 인스턴스)
  - 스킬 설치/생성
  - Cron 스케줄링
  - DB 테이블 생성
- [ ] Division 운영 시작 (HOTL 모드)
- [ ] 대시보드에서 Division 현황 확인 가능

**검증**:

1. "사업 제안 → Division 생성"의 end-to-end 플로우가 동작하는가?
2. 생성된 Division이 실제로 블로그 포스트를 자율 발행하는가?
3. 이 과정에서 Daino가 코드를 직접 짠 부분이 있는가? (있으면 실패)

**Go 조건**: 코드 작성 없이 대화만으로 Division이 생성되고 운영되기 시작
**No-Go 시**: Division Builder의 자동화 범위 재조정. 어디까지 자동이고 어디서부터 반자동인지 경계 재설정.

## Phase 2: 학습과 두 번째 Division (3~4주)

첫 번째 Division 운영에서 배운 것을 Institutional Memory에 저장하고,
두 번째 Division을 제안해서 Memory가 실제로 적용되는지 검증한다.

- [ ] Institutional Memory 구현
  - Phase 1에서 발생한 교훈 구조화 (성공/실패/도메인 지식)
  - 벡터 검색 + 태그 필터 + 신뢰도 점수
- [ ] 두 번째 사업 제안: "구매대행 사업 해보고 싶어" 또는 "디지털 상품 판매"
- [ ] Division Builder가 Memory를 참조하여 설계
  - 첫 번째 Division에서 배운 것이 반영되는가?
  - ("이미지 생성은 rate limit 조심" 같은 교훈이 자동 적용되는가?)
- [ ] 두 번째 Division 구축 + 운영 시작
- [ ] Strategy Layer 초안 — 두 Division 간 크로스 분석 시작

**검증**:

1. 두 번째 Division 생성이 첫 번째보다 빠르고 안정적인가?
2. Institutional Memory의 교훈이 실제로 반영되었는가?
3. Strategy Layer가 두 Division 간 패턴을 감지하는가?

**Go 조건**: 두 번째 Division Bootstrap Time < 첫 번째의 50%
**No-Go 시**: Memory 검색 메커니즘 개선 또는 수동 교훈 주입으로 보완

## Phase 3: 제품화 (4~6주)

Daino가 아닌 사람이 쓸 수 있게 만든다.

- [ ] ClawHub 배포 가능한 스킬 패키지 형태 설계
- [ ] 온보딩 플로우 ("당신의 첫 Division을 만들어보세요")
- [ ] 문서화 (설치 가이드, "사업 제안하는 법", FAQ)
- [ ] 에러 핸들링 + 보안 레이어 (스킬 화이트리스트, 비용 상한)
- [ ] Division 종료(Sunset) 프로세스
- [ ] 외부 테스터 1~2명과 검증

**검증**: Daino가 아닌 사람이 "카페 운영 사업" 같은 전혀 다른 Division을 성공적으로 생성하고 운영할 수 있는가?

## Phase 4: 성장 (ongoing)

- [ ] ClawHub에 Omni 스킬 패키지 등록
- [ ] 커뮤니티 빌딩 (Discord/GitHub)
- [ ] Institutional Memory 네트워크 효과 (다수 사용자의 교훈 축적)
- [ ] Daino의 Division들로 MAR 실증
- [ ] 비즈니스 모델 확정 (구독? 프리미엄? 수수료?)

## 타임라인

```
Phase 0 ────── Phase 1 ────────── Phase 2 ──────────── Phase 3 ────────────────── Phase 4
 1~2주          2~3주               3~4주                4~6주                     ongoing
 OS 기반        첫 Division         학습 + 둘째          제품화                     성장
 Builder MVP    "블로그 해보자"     Memory 검증          외부 사용자               커뮤니티

총 예상: 10~15주 (2.5~4개월)
```

## Go/No-Go 요약

| 전환 | Go 조건                                    | 핵심 질문                     |
| ---- | ------------------------------------------ | ----------------------------- |
| 0→1 | Builder가 사업 제안에 에이전트 구성안 제안 | "시스템이 사업을 이해하는가?" |
| 1→2 | 코드 없이 Division 생성 + 자율 운영 시작   | "진짜 OS처럼 동작하는가?"     |
| 2→3 | 두 번째 Division이 첫 번째보다 빠르게 생성 | "학습이 작동하는가?"          |
| 3→4 | 외부 사용자가 Division 생성 성공           | "제품인가?"                   |
