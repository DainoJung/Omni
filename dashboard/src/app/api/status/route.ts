import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

// GET /api/status — Full system status for Orchestrator
export async function GET() {
  const supabase = getSupabase()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: divisions },
    { data: agents },
    { count: eventCount },
    { data: pendingDecisions },
    { data: costMetrics },
    { data: recentMemories },
  ] = await Promise.all([
    supabase.from('divisions').select('id, name, slug, status, created_at').order('created_at'),
    supabase.from('agents').select('id, name, status, model, division_id, error_count, last_active_at'),
    supabase.from('agent_events').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00Z`),
    supabase.from('critical_decisions').select('id, title, priority, status').eq('status', 'pending'),
    supabase.from('division_metrics').select('division_id, metric_name, metric_value').eq('metric_name', 'api_cost').eq('period', 'daily').eq('period_start', today),
    supabase.from('memories').select('id, content, category, confidence').gt('confidence', 0.3).order('confidence', { ascending: false }).limit(5),
  ])

  const totalCost = (costMetrics ?? []).reduce((sum, m) => sum + Number(m.metric_value), 0)

  return NextResponse.json({
    divisions: (divisions ?? []).map(d => ({
      ...d,
      agents: (agents ?? []).filter(a => a.division_id === d.id).map(a => ({
        name: a.name,
        status: a.status,
        model: a.model,
        errors: a.error_count,
      })),
    })),
    summary: {
      totalDivisions: divisions?.length ?? 0,
      operatingDivisions: divisions?.filter(d => d.status === 'operating').length ?? 0,
      totalAgents: agents?.length ?? 0,
      activeAgents: agents?.filter(a => a.status === 'active').length ?? 0,
      todayEvents: eventCount ?? 0,
      pendingDecisions: pendingDecisions?.length ?? 0,
      dailyCost: totalCost,
    },
    pendingDecisions: pendingDecisions ?? [],
    recentMemories: recentMemories ?? [],
  })
}
