---
name: skill-generator
description: Auto-generate workspace skills for capabilities not found in ClawHub.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - OPENAI_API_KEY
    primaryEnv: OPENAI_API_KEY
    emoji: "⚙️"
---

# Skill Generator

ClawHub에서 매칭되지 않은 역량을 워크스페이스 스킬로 자동 생성합니다.

## 입력
- capability: Capability 객체
- generationPlan: SkillMatch.generationPlan 객체
- relevantMemories: 관련 Institutional Memory 배열

## 생성 프로세스
1. 공식 API 문서 참조 (generationPlan.apiDocs)
2. SKILL.md 생성 (ClawHub 포맷: YAML frontmatter + 마크다운)
3. 실행 스크립트 생성 (scripts/ 디렉토리)
4. Institutional Memory 교훈 반영
5. dry-run 테스트
6. 성공 시 스킬 디렉토리에 배치
7. 실패 시 에러 로그 + 에스컬레이션

## 생성 규칙
1. SKILL.md는 ClawHub 포맷을 따른다
2. 스크립트는 scripts/ 디렉토리에 배치
3. 외부 API 호출 시 반드시 rate limiting 적용
4. 에러는 명시적으로 반환 (빈 결과 반환 금지)
5. 환경변수로 인증 (하드코딩 금지)
6. Memory의 "failure" 카테고리 교훈을 반드시 확인

## 출력
```json
{
  "status": "success" | "failed",
  "skillPath": "skills/recipe-search/",
  "files": ["SKILL.md", "scripts/search.py"],
  "requiredEnv": ["YOUTUBE_API_KEY"],
  "testResult": { "passed": true, "output": "..." },
  "error": null
}
```

## Phase 0 범위
- 단순 SKILL.md 생성 (스크립트 포함)
- dry-run 테스트는 수동 검증
- Phase 1+에서 스크립트 자동 생성 + 테스트 자동화
