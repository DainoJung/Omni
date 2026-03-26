import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { callAgent, extractJsonFromText } from '@/lib/gateway'

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

// DivisionDesign JSON 스키마 (Builder가 출력해야 하는 형식)
const DESIGN_SCHEMA_PROMPT = `
반드시 아래 JSON 스키마로만 응답해. 설명 텍스트 없이 순수 JSON만 출력해:

\`\`\`json
{
  "version": 1,
  "business": {
    "description": "사업 설명",
    "targetMarket": "타겟 시장",
    "revenueModel": "수익 모델"
  },
  "capabilities": [
    {
      "name": "역량명",
      "description": "설명",
      "matchedSkill": "스킬명 or null",
      "skillSource": "clawhub | workspace | null",
      "status": "matched | generate"
    }
  ],
  "agents": [
    {
      "id": "agent-slug",
      "name": "표시 이름",
      "role": "역할 설명",
      "model": "gpt-5-mini",
      "skills": ["skill1", "skill2"],
      "schedule": { "type": "cron | interval | manual", "expression": "cron표현식 or null" }
    }
  ],
  "pipeline": [
    {
      "from": "agent-id",
      "to": "agent-id",
      "triggerType": "event | cron | manual",
      "messageType": "research_request",
      "dataFlow": "데이터 흐름 설명"
    }
  ],
  "synergies": [
    {
      "existingDivision": "Division 이름",
      "type": "data_share | audience_overlap | skill_reuse",
      "description": "시너지 설명"
    }
  ],
  "appliedLessons": [
    {
      "memory": "교훈 원문",
      "application": "어떻게 반영했는지"
    }
  ],
  "costEstimate": {
    "monthly": 50000,
    "breakdown": { "api_calls": 30000, "infrastructure": 20000 }
  }
}
\`\`\`
`

/**
 * POST /api/proposal
 *
 * Phase 0 핵심 플로우:
 * 1. 시스템 현황 조회 (status)
 * 2. 관련 메모리 검색
 * 3. Enriched context로 Division Builder 호출
 * 4. 구조화된 DivisionDesign JSON 파싱
 * 5. divisions 테이블에 status='designing'으로 저장
 */
export async function POST(request: NextRequest) {
  const { proposal, targetMarket, revenueModel, budget } = await request.json()

  if (!proposal?.trim()) {
    return NextResponse.json({ error: '사업 제안이 필요합니다' }, { status: 400 })
  }

  const supabase = getSupabase()

  try {
    // ──────────────────────────────────────
    // Step 1: 시스템 현황 조회
    // ──────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]

    const [
      { data: divisions },
      { data: agents },
      { data: costMetrics },
    ] = await Promise.all([
      supabase.from('divisions').select('id, name, slug, status, description').eq('status', 'operating'),
      supabase.from('agents').select('id, name, role, model, status, division_id'),
      supabase.from('division_metrics').select('division_id, metric_value').eq('metric_name', 'api_cost').eq('period', 'daily').eq('period_start', today),
    ])

    const operatingDivisions = divisions ?? []
    const allAgents = agents ?? []
    const totalDailyCost = (costMetrics ?? []).reduce((sum, m) => sum + Number(m.metric_value), 0)

    const statusSummary = operatingDivisions.map(d => {
      const divAgents = allAgents.filter(a => a.division_id === d.id)
      return `- ${d.name} (${d.slug}): ${d.description || '설명 없음'} | 에이전트 ${divAgents.length}개 (${divAgents.map(a => a.name).join(', ')})`
    }).join('\n')

    // ──────────────────────────────────────
    // Step 2: 관련 메모리 검색
    // ──────────────────────────────────────
    let memorySummary = '관련 교훈 없음'
    try {
      const { data: memories } = await supabase
        .from('memories')
        .select('content, category, confidence')
        .gt('confidence', 0.3)
        .order('confidence', { ascending: false })
        .limit(5)

      if (memories && memories.length > 0) {
        memorySummary = memories.map(m =>
          `- [${m.category}] (확신도 ${m.confidence}): ${m.content}`
        ).join('\n')
      }
    } catch {
      // Memory 검색 실패해도 진행
    }

    // ──────────────────────────────────────
    // Step 3: Division Builder 호출 (enriched context)
    // ──────────────────────────────────────
    const builderPrompt = `사업 제안을 분석하고 Division 설계안을 만들어줘.

━━ 사용자 제안 ━━
${proposal}
${targetMarket ? `타겟 고객: ${targetMarket}` : ''}
${revenueModel ? `수익 모델: ${revenueModel}` : ''}
${budget ? `월 예산: ${budget}` : ''}

━━ 현재 OS 현황 ━━
운영 중 Division ${operatingDivisions.length}개:
${statusSummary || '(없음)'}
총 에이전트: ${allAgents.length}개
일일 비용: ₩${totalDailyCost.toLocaleString()}

━━ 관련 교훈 (Institutional Memory) ━━
${memorySummary}

━━ 설계 원칙 ━━
1. 기존 Division과 중복되지 않는 역할
2. 기존 Division과의 시너지 가능성 탐색
3. 전체 비용 예산 내에서의 추가 비용 계산
4. 에이전트 수는 최소화 (3개 이하 권장)
5. Memory에서 온 교훈을 설계에 직접 반영

━━ ClawHub 스킬 검색 (필수!) ━━
설계안을 만들기 전에 반드시 exec 도구로 ClawHub를 실제 검색해야 한다.
추측으로 스킬 이름을 적지 말고, 실제 검색 결과만 사용해.

각 역량(capability)마다 아래 명령을 실행해:
  exec: openclaw skills search "영어 키워드"

예시:
  exec: openclaw skills search "web scraping"
  exec: openclaw skills search "blog post writer"
  exec: openclaw skills search "image generation"

검색 결과가 있으면 → agents[].skills에 실제 스킬명 기재, capabilities[].status = "matched"
검색 결과가 없으면 → capabilities[].status = "generate", skillSource = "workspace"

${DESIGN_SCHEMA_PROMPT}`

    const builderResponse = await callAgent('division-builder', builderPrompt, { timeoutMs: 180_000 })

    // ──────────────────────────────────────
    // Step 4: 구조화된 JSON 파싱
    // ──────────────────────────────────────
    const designDoc = extractJsonFromText(builderResponse)

    if (!designDoc || !designDoc.agents || !designDoc.pipeline) {
      // JSON 파싱 실패 시 raw text와 함께 저장
      const { data: division, error } = await supabase
        .from('divisions')
        .insert({
          name: `제안: ${proposal.slice(0, 50)}`,
          slug: `proposal-${Date.now()}`,
          description: proposal,
          status: 'designing',
          proposal_text: proposal,
          design_doc: { raw: builderResponse, version: 1, parseError: true },
        })
        .select('id')
        .single()

      if (error) throw new Error(`DB insert failed: ${error.message}`)

      return NextResponse.json({
        divisionId: division.id,
        status: 'designing',
        designDoc: null,
        rawResponse: builderResponse,
        warning: 'Builder 응답을 구조화된 JSON으로 파싱하지 못했습니다. 원본 텍스트를 저장했습니다.',
      })
    }

    // ──────────────────────────────────────
    // Step 5: DB 저장 (status='designing')
    // ──────────────────────────────────────
    const designName = (designDoc.business as Record<string, string>)?.description
      ? `${(designDoc.business as Record<string, string>).description.slice(0, 50)}`
      : proposal.slice(0, 50)

    const slug = `div-${Date.now()}`

    const { data: division, error: divError } = await supabase
      .from('divisions')
      .insert({
        name: designName,
        slug,
        description: proposal,
        status: 'designing',
        proposal_text: proposal,
        design_doc: { ...designDoc, version: designDoc.version || 1 },
      })
      .select('id, name, slug, status')
      .single()

    if (divError) throw new Error(`Division insert failed: ${divError.message}`)

    // 이벤트 기록
    await supabase.from('agent_events').insert({
      division_id: division.id,
      event_type: 'task_complete',
      payload: {
        action: 'design_created',
        detail: `Division "${division.name}" 설계안 v1 생성`,
        agentCount: (designDoc.agents as unknown[]).length,
        pipelineSteps: (designDoc.pipeline as unknown[]).length,
      },
    })

    return NextResponse.json({
      divisionId: division.id,
      status: 'designing',
      designDoc,
      division: { id: division.id, name: division.name, slug: division.slug },
    })

  } catch (err) {
    return NextResponse.json(
      { error: 'Division 설계 실패', detail: String(err) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/proposal — 설계 중인 Division 목록 조회
 */
export async function GET() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('divisions')
    .select('id, name, slug, description, status, proposal_text, design_doc, created_at, updated_at')
    .in('status', ['designing', 'proposed'])
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ proposals: data ?? [] })
}
