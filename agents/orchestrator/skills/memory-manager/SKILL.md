---
name: memory-manager
description: Store and retrieve Institutional Memory entries with vector search.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - SUPABASE_URL
        - SUPABASE_SERVICE_KEY
        - OPENAI_API_KEY
    primaryEnv: SUPABASE_URL
    emoji: "🧠"
---

# Memory Manager

Institutional Memory를 관리합니다. 교훈을 저장하고, 관련 기억을 검색합니다.

## 기능

### 저장 (memory_save)
- category: architecture | failure | domain | operations
- content: 교훈 내용
- tags: 검색용 태그 배열
- confidence: 0.0~1.0 (기본 0.5)
- division_id: 소속 Division (없으면 글로벌)

### 검색 (memory_search)
- query: 자연어 검색 쿼리
- tags: 태그 필터 (optional)
- category: 카테고리 필터 (optional)
- limit: 결과 수 (기본 10)

## 동작
1. 저장 시: OpenAI text-embedding-3-small로 임베딩 생성 → memories 테이블 INSERT
2. 검색 시: 쿼리 임베딩 → search_memories RPC 호출 → 결과 반환
3. 참조 시: times_referenced +1 증가
4. 무시 시: times_ignored +1 증가

## 출력
JSON: { memories: [{ id, content, category, tags, confidence, similarity }] }
