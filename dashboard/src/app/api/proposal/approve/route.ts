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
      id: string; name: string; role: string; model: string; schedule?: Record<string, unknown>
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
        schedule: a.schedule || {},
      })),
      pipeline: designPipeline.map(p => ({
        fromAgentId: `${division.slug}_${p.from}`,
        toAgentId: `${division.slug}_${p.to}`,
        triggerType: p.triggerType,
        messageType: p.messageType,
      })),
      workspacePath: `${process.env.OPENCLAW_WORKSPACE_BASE || '~/.openclaw/workspaces'}/${division.slug}`,
    }

    // /api/division/build 내부 호출
    const buildUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'}/api/division/build`
    const buildResponse = await fetch(buildUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequest),
    })

    const buildResult = await buildResponse.json()

    if (!buildResponse.ok) {
      // 빌드 실패 → status를 designing으로 롤백
      await supabase
        .from('divisions')
        .update({ status: 'designing', updated_at: new Date().toISOString() })
        .eq('id', divisionId)

      return NextResponse.json({
        error: '구축 실패 — 설계안 상태로 롤백되었습니다',
        buildError: buildResult,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      divisionId,
      buildResult,
    })

  } catch (err) {
    return NextResponse.json(
      { error: '승인 처리 실패', detail: String(err) },
      { status: 500 }
    )
  }
}
