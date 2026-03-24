---
name: capability-analyzer
description: Analyze business proposals and identify required capabilities for Division design.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - OPENAI_API_KEY
    primaryEnv: OPENAI_API_KEY
    emoji: "🔍"
---

# Capability Analyzer

사업 제안을 분석하여 필요한 역량(capability)을 식별합니다.

## 입력
- proposal_text: 사업 제안 텍스트 (자연어)

## 분석 프로세스
1. 사업 목표를 기능 역량으로 분해
2. 각 역량에 필요한 도구/API 식별
3. 역량 간 의존관계 매핑
4. 우선순위 분류 (core / nice-to-have)

## 출력 스키마

```json
{
  "businessSummary": "사업 한줄 요약",
  "targetMarket": "타겟 시장",
  "revenueModel": "수익 모델",
  "capabilities": [
    {
      "id": "trend-research",
      "name": "트렌드 탐색",
      "description": "상세 설명",
      "priority": "core",
      "frequency": "every 2 hours",
      "requiredApis": ["YouTube Data API v3"],
      "suggestedSkillQuery": "youtube trends korea"
    }
  ],
  "dependencies": [
    {
      "from": "trend-research",
      "to": "content-writing",
      "dataFlow": "topics + keywords"
    }
  ]
}
```

## 규칙
- 역량은 자동화 가능한 구체적 단위여야 함
  (O: "트렌드 탐색", "콘텐츠 작성" / X: "마케팅", "영업")
- core 역량이 3개 미만이면 사업 범위 재확인 요청
- requiredApis는 공식 API명 사용
