import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

// POST /api/division/update — Update division status or delete
export async function POST(request: NextRequest) {
  const { divisionId, action } = await request.json()
  const supabase = getSupabase()

  if (!divisionId) {
    return NextResponse.json({ error: 'divisionId가 필요합니다' }, { status: 400 })
  }

  // ── Hard Delete ──
  if (action === 'delete') {
    // Division 이름 조회 (로그용)
    const { data: div } = await supabase
      .from('divisions')
      .select('name')
      .eq('id', divisionId)
      .single()

    // 스키마에 FK CASCADE가 완비되지 않은 환경을 위해 자식 레코드를 수동 정리
    const { data: agents, error: agentLookupError } = await supabase
      .from('agents')
      .select('id')
      .eq('division_id', divisionId)

    if (agentLookupError) {
      return NextResponse.json({ error: agentLookupError.message }, { status: 500 })
    }

    const agentIds = (agents ?? []).map(agent => agent.id)

    const isIgnorableMissingTableError = (message?: string | null) =>
      !!message && message.includes('Could not find the table')

    const deleteDivisionRows = async (table: string) => {
      const { error } = await supabase.from(table).delete().eq('division_id', divisionId)
      if (isIgnorableMissingTableError(error?.message)) return null
      return error
    }

    const deleteAgentRows = async (table: string) => {
      if (agentIds.length === 0) return null
      const { error } = await supabase.from(table).delete().in('agent_id', agentIds)
      if (isIgnorableMissingTableError(error?.message)) return null
      return error
    }

    const cleanupErrors = await Promise.all([
      deleteDivisionRows('agent_events'),
      deleteDivisionRows('critical_decisions'),
      deleteDivisionRows('pipeline_outputs'),
      deleteDivisionRows('division_metrics'),
      deleteDivisionRows('division_pipelines'),
      deleteDivisionRows('llm_usage'),
      deleteDivisionRows('memories'),
      deleteAgentRows('agent_skills'),
      deleteAgentRows('agent_credentials'),
    ])

    const firstCleanupError = cleanupErrors.find(Boolean)
    if (firstCleanupError) {
      return NextResponse.json({ error: firstCleanupError.message }, { status: 500 })
    }

    const { error: agentDeleteError } = await supabase
      .from('agents')
      .delete()
      .eq('division_id', divisionId)

    if (agentDeleteError) {
      return NextResponse.json({ error: agentDeleteError.message }, { status: 500 })
    }

    const { error } = await supabase
      .from('divisions')
      .delete()
      .eq('id', divisionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: divisionId, name: div?.name, deletedAgents: agentIds.length })
  }

  // ── Status Update ──
  const statusMap: Record<string, string> = {
    pause: 'paused',
    resume: 'operating',
    sunset: 'sunset',
    designing: 'designing',
    building: 'building',
  }

  const newStatus = statusMap[action]
  if (!newStatus) {
    return NextResponse.json({ error: `Invalid action: ${action}. Use: pause, resume, sunset, delete, designing, building` }, { status: 400 })
  }

  const { data: division, error } = await supabase
    .from('divisions')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', divisionId)
    .select('id, name, status')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log event
  await supabase.from('agent_events').insert({
    division_id: divisionId,
    event_type: 'task_complete',
    payload: { action: `division_${action}`, detail: `Division "${division.name}" status → ${newStatus}` },
  })

  return NextResponse.json({ success: true, division })
}
