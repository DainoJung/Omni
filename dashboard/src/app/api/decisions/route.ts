import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

// ──────────────────────────────────────
// POST: Create a Critical Decision
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  const { divisionId, agentId, priority, title, description, context, options, recommendation, expiresIn } = await request.json()

  if (!title || !description) {
    return NextResponse.json({ error: 'title과 description이 필요합니다' }, { status: 400 })
  }

  const supabase = getSupabase()

  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 기본 24시간

  const { data, error } = await supabase
    .from('critical_decisions')
    .insert({
      division_id: divisionId || null,
      agent_id: agentId || null,
      priority: priority || 'medium',
      title,
      description,
      context: context || {},
      options: options || [],
      recommendation: recommendation ?? null,
      expires_at: expiresAt,
    })
    .select('id, title, priority, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 이벤트 기록
  await supabase.from('agent_events').insert({
    division_id: divisionId || null,
    agent_id: agentId || null,
    event_type: 'escalation',
    payload: {
      action: 'decision_created',
      decisionId: data.id,
      title,
      priority: priority || 'medium',
    },
  })

  return NextResponse.json({ decision: data })
}

// ──────────────────────────────────────
// GET: List Critical Decisions
// ──────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'
  const divisionId = searchParams.get('divisionId')
  const limit = parseInt(searchParams.get('limit') || '20')

  const supabase = getSupabase()

  let query = supabase
    .from('critical_decisions')
    .select('*, divisions(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status !== 'all') query = query.eq('status', status)
  if (divisionId) query = query.eq('division_id', divisionId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ decisions: data ?? [] })
}

// ──────────────────────────────────────
// PATCH: Resolve a Critical Decision
// ──────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const { id, decidedOption, decidedNote, status: newStatus } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })
  }

  const supabase = getSupabase()

  const resolvedStatus = newStatus || (decidedOption !== undefined ? 'approved' : 'rejected')

  const { data, error } = await supabase
    .from('critical_decisions')
    .update({
      status: resolvedStatus,
      decided_option: decidedOption ?? null,
      decided_note: decidedNote || null,
      decided_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, title, status, decided_option, decided_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 이벤트 기록
  const { data: decision } = await supabase
    .from('critical_decisions')
    .select('division_id, agent_id, title, options')
    .eq('id', id)
    .single()

  if (decision) {
    const selectedLabel = Array.isArray(decision.options) && decidedOption !== undefined
      ? (decision.options[decidedOption] as { label?: string })?.label
      : resolvedStatus

    await supabase.from('agent_events').insert({
      division_id: decision.division_id,
      agent_id: decision.agent_id,
      event_type: 'task_complete',
      payload: {
        action: 'decision_resolved',
        decisionId: id,
        title: decision.title,
        result: selectedLabel,
        note: decidedNote,
      },
    })
  }

  return NextResponse.json({ decision: data })
}
