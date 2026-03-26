import { createClient } from '@/lib/supabase/server'
import { CommandCenterClient } from '@/components/command-center-client'

interface Division {
  id: string
  name: string
  slug: string
  status: string
  description: string | null
  agents: { id: string; name: string; role: string; status: string; model: string }[]
}

interface DivisionMetric {
  metric_value: number
}

export default async function CommandCenter() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { data: divisions },
    { data: pendingDecisions },
    { count: totalAgents },
    { count: todayEvents },
    { data: costRows },
  ] = await Promise.all([
    supabase
      .from('divisions')
      .select('*, agents(id, name, role, status, model)')
      .order('created_at', { ascending: false }),
    supabase.from('critical_decisions').select('id').eq('status', 'pending'),
    supabase.from('agents').select('id', { count: 'exact', head: true }),
    supabase
      .from('agent_events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString()),
    supabase
      .from('division_metrics')
      .select('metric_value')
      .eq('metric_name', 'api_cost')
      .eq('period', 'daily')
      .eq('period_start', new Date().toISOString().split('T')[0]),
  ])

  const dailyCost =
    (costRows as DivisionMetric[] | null)?.reduce(
      (sum, row) => sum + (row.metric_value ?? 0),
      0
    ) ?? 0

  return (
    <CommandCenterClient
      divisions={(divisions as Division[] | null) ?? []}
      pendingDecisionCount={pendingDecisions?.length ?? 0}
      todayEvents={todayEvents ?? 0}
      dailyCost={dailyCost}
      totalAgents={totalAgents ?? 0}
    />
  )
}
