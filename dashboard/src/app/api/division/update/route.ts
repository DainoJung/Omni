import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

// POST /api/division/update — Update division status (pause/resume/sunset)
export async function POST(request: NextRequest) {
  const { divisionId, action } = await request.json()
  const supabase = getSupabase()

  const statusMap: Record<string, string> = {
    pause: 'paused',
    resume: 'operating',
    sunset: 'sunset',
  }

  const newStatus = statusMap[action]
  if (!newStatus) {
    return NextResponse.json({ error: `Invalid action: ${action}. Use: pause, resume, sunset` }, { status: 400 })
  }

  // Update division
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
