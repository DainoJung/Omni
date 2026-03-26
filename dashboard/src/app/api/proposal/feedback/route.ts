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

/**
 * POST /api/proposal/feedback
 *
 * 설계안에 대한 피드백을 Builder에게 전달하고 수정된 설계안을 받는다.
 * Body: { divisionId: string, feedback: string }
 */
export async function POST(request: NextRequest) {
  const { divisionId, feedback } = await request.json()

  if (!divisionId || !feedback?.trim()) {
    return NextResponse.json({ error: 'divisionId와 feedback이 필요합니다' }, { status: 400 })
  }

  const supabase = getSupabase()

  try {
    // 현재 설계안 조회
    const { data: division, error: fetchError } = await supabase
      .from('divisions')
      .select('id, name, status, proposal_text, design_doc')
      .eq('id', divisionId)
      .single()

    if (fetchError || !division) {
      return NextResponse.json({ error: 'Division을 찾을 수 없습니다' }, { status: 404 })
    }

    if (division.status !== 'designing') {
      return NextResponse.json({ error: `피드백은 designing 상태에서만 가능합니다 (현재: ${division.status})` }, { status: 400 })
    }

    const currentDesign = division.design_doc as Record<string, unknown>
    const currentVersion = (currentDesign?.version as number) || 1

    if (currentVersion >= 10) {
      return NextResponse.json({ error: '피드백 횟수 상한(10회)에 도달했습니다. 승인하거나 새로 제안해주세요.' }, { status: 400 })
    }

    // Builder에게 피드백 + 현재 설계안 전달
    const builderPrompt = `이전 설계안에 대한 피드백을 반영해서 수정된 설계안을 만들어줘.

━━ 원본 제안 ━━
${division.proposal_text}

━━ 현재 설계안 (v${currentVersion}) ━━
\`\`\`json
${JSON.stringify(currentDesign, null, 2)}
\`\`\`

━━ 사용자 피드백 ━━
${feedback}

━━ 지시사항 ━━
1. 피드백을 반영하여 설계안을 수정해
2. version 필드를 ${currentVersion + 1}로 올려
3. 이전과 동일한 JSON 스키마로만 응답해
4. 설명 텍스트 없이 순수 JSON만 출력해`

    const builderResponse = await callAgent('division-builder', builderPrompt, { timeoutMs: 180_000 })
    const revisedDesign = extractJsonFromText(builderResponse)

    if (!revisedDesign) {
      return NextResponse.json({
        error: 'Builder 응답을 JSON으로 파싱하지 못했습니다',
        rawResponse: builderResponse,
      }, { status: 502 })
    }

    // version 보장
    revisedDesign.version = currentVersion + 1

    // DB 업데이트
    const { error: updateError } = await supabase
      .from('divisions')
      .update({
        design_doc: revisedDesign,
        updated_at: new Date().toISOString(),
      })
      .eq('id', divisionId)

    if (updateError) throw new Error(`Update failed: ${updateError.message}`)

    // 이벤트 기록
    await supabase.from('agent_events').insert({
      division_id: divisionId,
      event_type: 'task_complete',
      payload: {
        action: 'design_revised',
        detail: `설계안 v${currentVersion} → v${currentVersion + 1} (피드백 반영)`,
        feedback: feedback.slice(0, 200),
      },
    })

    return NextResponse.json({
      divisionId,
      version: currentVersion + 1,
      designDoc: revisedDesign,
    })

  } catch (err) {
    return NextResponse.json(
      { error: '피드백 처리 실패', detail: String(err) },
      { status: 500 }
    )
  }
}
