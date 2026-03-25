# Omni v2 — User Guide

## 사업 제안하는 법

### Step 1: 제안
Dashboard에서 "New Division"을 클릭하거나, OpenClaw에 직접 메시지:

> "온라인 교육 사업을 해보고 싶어"

### Step 2: 검토
Division Builder가 설계안을 생성합니다:
- 필요한 역량 분석
- ClawHub 스킬 매칭
- 에이전트 구성 제안
- 파이프라인 설계
- 비용 예측

### Step 3: 피드백
설계안을 검토하고 피드백을 보냅니다:

> "결제 시스템도 연동해줘. 모바일 최적화도."

Builder가 피드백을 반영해서 v2를 제출합니다.

### Step 4: 승인
설계안이 마음에 들면 승인합니다.
Builder가 자동으로 Division을 구축합니다.

### Step 5: 모니터링
Dashboard Command Center에서 Division 현황을 확인합니다.
Critical Decision이 발생하면 승인/거부합니다.

## Division 관리

### 일시정지 (Pause)
Division 상세 페이지에서 "Pause" 클릭.
모든 에이전트가 일시 중지됩니다.

### 재개 (Resume)
일시정지된 Division에서 "Resume" 클릭.

### 종료 (Sunset)
Division 상세 페이지에서 "Sunset" 클릭 → 확인.
모든 에이전트가 비활성화되고, Division이 종료됩니다.
종료된 Division의 데이터는 보존됩니다.

## Critical Decision

아래 상황에서 시스템이 사람의 승인을 요청합니다:
- 일 ₩50,000 초과 비용
- 외부 메시지 발송
- 비가역적 작업 (삭제, 대량 작업)
- 에이전트 확신도 낮은 판단
- Division 변경 (생성/종료)

Dashboard의 "Decisions" 페이지에서 승인/거부할 수 있습니다.

## FAQ

**Q: Division을 몇 개까지 만들 수 있나요?**
A: 제한 없음. 다만 각 Division은 API 비용이 발생하므로 비용을 모니터링하세요.

**Q: 에이전트가 오류를 내면 어떻게 되나요?**
A: 3회 연속 에러 시 자동 일시정지되고, Critical Decision으로 보고됩니다.

**Q: 비용이 너무 많이 나가면?**
A: 일일 비용 상한(기본 ₩50,000)을 초과하면 Division이 자동 일시정지됩니다.

**Q: Institutional Memory란?**
A: Division 운영에서 배운 교훈이 자동으로 축적됩니다. 새 Division 생성 시 Builder가 참조합니다.
