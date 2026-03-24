---
name: clawhub-searcher
description: Search ClawHub skill registry and match capabilities to available skills.
version: 1.0.0
metadata:
  openclaw:
    requires:
      bins:
        - openclaw
    emoji: "🔎"
---

# ClawHub Searcher

역량(capability)에 맞는 ClawHub 스킬을 탐색하고 매칭합니다.

## 입력
- capabilities: CapabilityAnalysis의 capabilities 배열

## 프로세스
1. 각 capability의 suggestedSkillQuery로 ClawHub 검색
   `openclaw skills search "{query}"`
2. 검색 결과에서 가장 적합한 스킬 선택 (평점, 다운로드 수 기준)
3. 매칭되지 않는 역량 → auto-generate로 표시

## 출력 스키마

```json
[
  {
    "capabilityId": "trend-research",
    "status": "matched",
    "clawhubSkill": {
      "name": "youtube-trends",
      "version": "1.2.0",
      "description": "...",
      "rating": 4.5,
      "downloads": 1200,
      "requiredEnv": ["YOUTUBE_API_KEY"]
    }
  },
  {
    "capabilityId": "recipe-search",
    "status": "auto-generate",
    "generationPlan": {
      "skillName": "recipe-search",
      "apiDocs": "https://developers.google.com/youtube/v3",
      "approach": "YouTube API + 웹 검색 fallback",
      "estimatedEffort": "simple"
    }
  }
]
```

## 매칭 기준
- rating >= 3.0
- downloads >= 100
- requiredEnv가 현재 설정된 환경변수와 호환
- 최신 업데이트가 6개월 이내

## 매칭 실패 시
- status: "auto-generate" → skill-generator가 처리
- status: "manual-required" → 사람에게 에스컬레이션 (복잡한 API 연동)
