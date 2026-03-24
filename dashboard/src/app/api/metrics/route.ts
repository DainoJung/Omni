import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

// POST: Record a metric (upsert daily)
export async function POST(request: NextRequest) {
  const { divisionId, metricName, value, metadata } = await request.json()
  const supabase = getSupabase()
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('division_metrics')
    .select('id, metric_value')
    .eq('division_id', divisionId)
    .eq('metric_name', metricName)
    .eq('period', 'daily')
    .eq('period_start', today)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('division_metrics')
      .update({ metric_value: existing.metric_value + value, metadata: metadata || {} })
      .eq('id', existing.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('division_metrics')
      .insert({
        division_id: divisionId,
        metric_name: metricName,
        metric_value: value,
        period: 'daily',
        period_start: today,
        metadata: metadata || {},
      })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// GET: Get metrics
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const divisionId = searchParams.get('divisionId')
  const period = searchParams.get('period') || 'daily'
  const limit = parseInt(searchParams.get('limit') || '30')

  const supabase = getSupabase()

  let query = supabase
    .from('division_metrics')
    .select('*')
    .eq('period', period)
    .order('period_start', { ascending: false })
    .limit(limit)

  if (divisionId) query = query.eq('division_id', divisionId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ metrics: data })
}
