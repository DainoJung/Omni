---
name: supabase-client
description: Supabase database operations for Omni OS agents.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - SUPABASE_URL
        - SUPABASE_SERVICE_KEY
    primaryEnv: SUPABASE_URL
    emoji: "🗄️"
---

# Supabase Client

Omni OS 에이전트가 Supabase 데이터베이스와 상호작용합니다.

## 기능

### 조회 (query)
- table: 테이블 이름
- filters: 필터 조건 객체
- select: 선택할 컬럼 (기본 *)
- limit: 결과 수 제한
- order: 정렬 기준

### 삽입 (insert)
- table: 테이블 이름
- data: 삽입할 데이터 객체 또는 배열

### 업데이트 (update)
- table: 테이블 이름
- filters: WHERE 조건
- data: 업데이트할 데이터

### 이벤트 기록 (log_event)
- agent_id: 에이전트 UUID
- division_id: Division UUID
- event_type: 이벤트 타입
- payload: 이벤트 데이터

## 제한사항
- DELETE 작업은 지원하지 않음 (Critical Decision으로 에스컬레이션 필요)
- 배치 작업 10건 이상 시 경고
- service_key 사용 (RLS bypass) — Phase 3에서 anon_key로 전환
