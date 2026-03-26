import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

// POST: Save a pipeline step output
export async function POST(request: NextRequest) {
  const { divisionId, agentId, pipelineRunId, stepName, stepOrder, outputType, outputData } = await request.json()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('pipeline_outputs')
    .insert({
      division_id: divisionId,
      agent_id: agentId || null,
      pipeline_run_id: pipelineRunId,
      step_name: stepName,
      step_order: stepOrder,
      output_type: outputType,
      output_data: outputData,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also log as agent_event
  await supabase.from('agent_events').insert({
    agent_id: agentId || null,
    division_id: divisionId,
    event_type: 'task_complete',
    payload: {
      action: `pipeline_${stepName}`,
      pipeline_run_id: pipelineRunId,
      output_type: outputType,
      output_id: data.id,
    },
  })

  return NextResponse.json({ id: data.id, success: true })
}

// GET: Get pipeline outputs for a division
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const divisionId = searchParams.get('divisionId')
  const pipelineRunId = searchParams.get('runId')
  const limit = parseInt(searchParams.get('limit') || '20')

  const supabase = getSupabase()

  let query = supabase
    .from('pipeline_outputs')
    .select('*, agents(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (divisionId) query = query.eq('division_id', divisionId)
  if (pipelineRunId) query = query.eq('pipeline_run_id', pipelineRunId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ outputs: data })
}
