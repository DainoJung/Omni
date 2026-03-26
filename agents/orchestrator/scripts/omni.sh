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
  *)
    echo '{"error":"Unknown command","usage":"status | memory-search <query> | division-pause <id> | division-resume <id> | division-sunset <id> | division-build <json> | memory-save <json> | metric-record <json> | output-save <json> | output-list <id> | proposal-create <json> | proposal-list | proposal-feedback <json> | proposal-approve <json>"}'
    exit 1
    ;;
esac
