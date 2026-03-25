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
  *)
    echo '{"error":"Unknown command","usage":"status | memory-search <query> | division-pause <id> | division-resume <id> | division-sunset <id> | division-build <json> | memory-save <json> | metric-record <json>"}'
    exit 1
    ;;
esac
