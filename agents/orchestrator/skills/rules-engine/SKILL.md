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
    emoji: "🛡️"
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

## 평가 프로세스

입력: { action, agentId, divisionId, estimatedCost, confidence, description }

1. 자동 차단 목록 확인 → 해당 시 즉시 거부
2. Critical Decision 기준 확인 → 해당 시 에스컬레이션
3. 통과 시 → { approved: true } 반환

## 에스컬레이션 포맷

critical_decisions 테이블에 INSERT:
- priority: 규칙 번호에 따라 (1,3=high, 2,4=medium, 5,6=low)
- context: 해당 작업의 전체 컨텍스트 (JSON)
- options: 최소 2개 선택지 + 추천 [{ label, description, recommended }]
- expires_at: 생성 후 24시간 (기본)

## 출력
JSON: { approved: boolean, reason?: string, decisionId?: string }
