import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

/**
 * POST /api/proposal/approve
 *
 * 설계안을 승인하고 Division 구축을 시작한다.
 * Body: { divisionId: string }
 *
 * 1. divisions.status → 'building'
 * 2. design_doc에서 BuildRequest 생성
 * 3. /api/division/build 호출
 */
export async function POST(request: NextRequest) {
  const { divisionId } = await request.json()

  if (!divisionId) {
    return NextResponse.json({ error: 'divisionId가 필요합니다' }, { status: 400 })
  }

  const supabase = getSupabase()

  try {
    // 설계안 조회
    const { data: division, error: fetchError } = await supabase
      .from('divisions')
      .select('id, name, slug, description, status, proposal_text, design_doc')
      .eq('id', divisionId)
      .single()

    if (fetchError || !division) {
      return NextResponse.json({ error: 'Division을 찾을 수 없습니다' }, { status: 404 })
    }

    if (division.status !== 'designing') {
      return NextResponse.json({ error: `승인은 designing 상태에서만 가능합니다 (현재: ${division.status})` }, { status: 400 })
    }

    const designDoc = division.design_doc as Record<string, unknown>
    if (!designDoc || designDoc.parseError) {
      return NextResponse.json({ error: '유효한 설계안이 없습니다' }, { status: 400 })
    }

    // status → building
    await supabase
      .from('divisions')
      .update({ status: 'building', updated_at: new Date().toISOString() })
      .eq('id', divisionId)

    // 이벤트 기록
    await supabase.from('agent_events').insert({
      division_id: divisionId,
      event_type: 'task_complete',
      payload: {
        action: 'design_approved',
        detail: `설계안 v${designDoc.version || 1} 승인 → 구축 시작`,
      },
    })

    // design_doc에서 BuildRequest 변환
    const designAgents = designDoc.agents as Array<{
      id: string; name: string; role: string; model: string; skills?: string[]; schedule?: Record<string, unknown>
      requirements?: Array<{ type: string; service: string; env: string; required?: boolean; description?: string; setupUrl?: string }>
      outputs?: Array<{ type: string; format: string; destination: string; description?: string }>
    }>
    const designPipeline = designDoc.pipeline as Array<{
      from: string; to: string; triggerType: string; messageType: string
    }>

    const buildRequest = {
      name: division.name,
      slug: division.slug,
      description: division.description,
      proposalText: division.proposal_text,
      designDoc,
      agents: designAgents.map(a => ({
        id: `${division.slug}_${a.id}`,
        name: a.name,
        role: a.role,
        model: a.model || 'gpt-5-mini',
        skills: a.skills || [],
        schedule: a.schedule || {},
        requirements: a.requirements || [],
        outputs: a.outputs || [],
      })),
      pipeline: designPipeline.map(p => ({
        fromAgentId: `${division.slug}_${p.from}`,
        toAgentId: `${division.slug}_${p.to}`,
        triggerType: p.triggerType,
        messageType: p.messageType,
      })),
      executionScripts: (designDoc.executionScripts || []) as Array<{
        name: string; language: string; purpose: string; agentId: string;
        requirements: string[]; inputFormat: string; outputFormat: string;
        externalService: string; apiDocs?: string
      }>,
      workspacePath: `${process.env.OPENCLAW_WORKSPACE_BASE || `${process.env.HOME}/.openclaw/workspaces`}/${division.slug}`,
    }

    // 빌드를 비동기로 트리거 (self-call 데드락 방지)
    // approve는 즉시 응답하고, 빌드는 백그라운드에서 진행
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'

    // fire-and-forget: 빌드 요청을 보내고 응답을 기다리지 않음
    fetch(`${appUrl}/api/division/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequest),
    }).then(async (res) => {
      if (!res.ok) {
        // 빌드 실패 → status를 designing으로 롤백
        const supabaseRollback = getSupabase()
        await supabaseRollback
          .from('divisions')
          .update({ status: 'designing', updated_at: new Date().toISOString() })
          .eq('id', divisionId)
      }
    }).catch(() => {
      // 네트워크 에러 시 롤백
      const supabaseRollback = getSupabase()
      supabaseRollback
        .from('divisions')
        .update({ status: 'designing', updated_at: new Date().toISOString() })
        .eq('id', divisionId)
    })

    return NextResponse.json({
      success: true,
      divisionId,
      message: '승인 완료. 구축이 백그라운드에서 진행됩니다. Dashboard에서 진행 상태를 확인하세요.',
    })

  } catch (err) {
    return NextResponse.json(
      { error: '승인 처리 실패', detail: String(err) },
      { status: 500 }
    )
  }
}
