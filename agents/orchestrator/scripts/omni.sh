#!/usr/bin/env bash
# Omni OS CLI — Orchestrator가 exec로 호출하는 시스템 제어 스크립트
# Usage: bash scripts/omni.sh <command> [args]

API="http://127.0.0.1:3000/api"

case "$1" in
  status)
    curl -s "$API/status" 2>/dev/null
    ;;
  memory-search)
    # Usage: bash scripts/omni.sh memory-search "검색어" [category]
    QUERY="${2:?검색어 필요}"
    CATEGORY="${3:-}"
    URL="$API/memory?q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$QUERY'))")"
    [ -n "$CATEGORY" ] && URL="$URL&category=$CATEGORY"
    curl -s "$URL" 2>/dev/null
    ;;
  division-pause)
    # Usage: bash scripts/omni.sh division-pause <division-id>
    ID="${2:?division-id 필요}"
    curl -s -X POST "$API/division/update" -H "Content-Type: application/json" -d "{\"divisionId\":\"$ID\",\"action\":\"pause\"}" 2>/dev/null
    ;;
  division-resume)
    ID="${2:?division-id 필요}"
    curl -s -X POST "$API/division/update" -H "Content-Type: application/json" -d "{\"divisionId\":\"$ID\",\"action\":\"resume\"}" 2>/dev/null
    ;;
  division-sunset)
    ID="${2:?division-id 필요}"
    curl -s -X POST "$API/division/update" -H "Content-Type: application/json" -d "{\"divisionId\":\"$ID\",\"action\":\"sunset\"}" 2>/dev/null
    ;;
  division-delete)
    # Usage: bash scripts/omni.sh division-delete <division-id>
    # 주의: 완전 삭제 (에이전트, 이벤트, 파이프라인, 메트릭 등 전부 CASCADE 삭제)
    ID="${2:?division-id 필요}"
    curl -s -X POST "$API/division/update" -H "Content-Type: application/json" -d "{\"divisionId\":\"$ID\",\"action\":\"delete\"}" 2>/dev/null
    ;;
  division-build)
    # Usage: bash scripts/omni.sh division-build '<json-body>'
    BODY="${2:?JSON body 필요}"
    curl -s -X POST "$API/division/build" -H "Content-Type: application/json" -d "$BODY" 2>/dev/null
    ;;
  memory-save)
    # Usage: bash scripts/omni.sh memory-save '<json-body>'
    BODY="${2:?JSON body 필요}"
    curl -s -X POST "$API/memory" -H "Content-Type: application/json" -d "$BODY" 2>/dev/null
    ;;
  metric-record)
    # Usage: bash scripts/omni.sh metric-record '<json-body>'
    BODY="${2:?JSON body 필요}"
    curl -s -X POST "$API/metrics" -H "Content-Type: application/json" -d "$BODY" 2>/dev/null
    ;;
  output-save)
    # Usage: bash scripts/omni.sh output-save '<json-body>'
    # JSON: {"divisionId":"...","pipelineRunId":"...","stepName":"researcher","stepOrder":1,"outputType":"research_result","outputData":{...}}
    BODY="${2:?JSON body 필요}"
    curl -s -X POST "$API/output" -H "Content-Type: application/json" -d "$BODY" 2>/dev/null
    ;;
  output-list)
    # Usage: bash scripts/omni.sh output-list <division-id> [limit]
    ID="${2:?division-id 필요}"
    LIMIT="${3:-10}"
    curl -s "$API/output?divisionId=$ID&limit=$LIMIT" 2>/dev/null
    ;;
  proposal-create)
    # Usage: bash scripts/omni.sh proposal-create '<json-body>'
    # JSON: {"proposal":"사업 아이디어","targetMarket":"...","revenueModel":"...","budget":"..."}
    BODY="${2:?JSON body 필요}"
    curl -s -X POST "$API/proposal" -H "Content-Type: application/json" -d "$BODY" 2>/dev/null
    ;;
  proposal-list)
    # Usage: bash scripts/omni.sh proposal-list
    curl -s "$API/proposal" 2>/dev/null
    ;;
  proposal-feedback)
    # Usage: bash scripts/omni.sh proposal-feedback '<json-body>'
    # JSON: {"divisionId":"...","feedback":"수정 요청 내용"}
    BODY="${2:?JSON body 필요}"
    curl -s -X POST "$API/proposal/feedback" -H "Content-Type: application/json" -d "$BODY" 2>/dev/null
    ;;
  proposal-approve)
    # Usage: bash scripts/omni.sh proposal-approve '<json-body>'
    # JSON: {"divisionId":"..."}
    BODY="${2:?JSON body 필요}"
    curl -s -X POST "$API/proposal/approve" -H "Content-Type: application/json" -d "$BODY" 2>/dev/null
    ;;
  decision-create)
    # Usage: bash scripts/omni.sh decision-create '<json-body>'
    # JSON: {"divisionId":"...","priority":"high","title":"...","description":"...","options":[...],"recommendation":0}
    BODY="${2:?JSON body 필요}"
    curl -s -X POST "$API/decisions" -H "Content-Type: application/json" -d "$BODY" 2>/dev/null
    ;;
  decision-list)
    # Usage: bash scripts/omni.sh decision-list [status]
    STATUS="${2:-pending}"
    curl -s "$API/decisions?status=$STATUS" 2>/dev/null
    ;;
  decision-resolve)
    # Usage: bash scripts/omni.sh decision-resolve '<json-body>'
    # JSON: {"id":"...","decidedOption":0,"decidedNote":"승인 사유"}
    BODY="${2:?JSON body 필요}"
    curl -s -X PATCH "$API/decisions" -H "Content-Type: application/json" -d "$BODY" 2>/dev/null
    ;;
  metric-list)
    # Usage: bash scripts/omni.sh metric-list <division-id> [period] [limit]
    ID="${2:?division-id 필요}"
    PERIOD="${3:-daily}"
    LIMIT="${4:-7}"
    curl -s "$API/metrics?divisionId=$ID&period=$PERIOD&limit=$LIMIT" 2>/dev/null
    ;;
  cost-record)
    # Usage: bash scripts/omni.sh cost-record '<json-body>'
    # JSON: {"divisionId":"...","agentId":"...","model":"gpt-5-mini","inputTokens":500,"outputTokens":200,"caller":"pipeline","metadata":{}}
    BODY="${2:?JSON body 필요}"
    curl -s -X POST "$API/llm-usage" -H "Content-Type: application/json" -d "$BODY" 2>/dev/null
    ;;
  cost-summary)
    # Usage: bash scripts/omni.sh cost-summary [division-id] [days]
    ID="${2:-}"
    DAYS="${3:-7}"
    URL="$API/llm-usage?days=$DAYS"
    [ -n "$ID" ] && URL="$URL&divisionId=$ID"
    curl -s "$URL" 2>/dev/null
    ;;
  *)
    echo '{"error":"Unknown command","usage":"status | memory-search <query> | division-pause <id> | division-resume <id> | division-sunset <id> | division-build <json> | memory-save <json> | metric-record <json> | output-save <json> | output-list <id> | proposal-create <json> | proposal-list | proposal-feedback <json> | proposal-approve <json> | cost-record <json> | cost-summary [id] [days]"}'
    exit 1
    ;;
esac
