import { createClient } from '@/lib/supabase/server'
import { FinanceDashboard } from '@/components/finance-dashboard'

export default async function FinancePage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: divisions },
    { data: llmUsage },
    { data: dailyMetrics },
    { data: todayCost },
  ] = await Promise.all([
    supabase
      .from('divisions')
      .select('id, name, slug, status')
      .in('status', ['operating', 'building', 'paused'])
      .order('created_at'),
    supabase
      .from('llm_usage')
      .select('*')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('division_metrics')
      .select('*')
      .eq('period', 'daily')
      .gte('period_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('period_start', { ascending: false })
      .limit(500),
    supabase
      .from('division_metrics')
      .select('division_id, metric_value')
      .eq('metric_name', 'api_cost')
      .eq('period', 'daily')
      .eq('period_start', today),
  ])

  const totalDailyCost = (todayCost ?? []).reduce((s, m) => s + Number(m.metric_value), 0)

  return (
    <FinanceDashboard
      divisions={divisions ?? []}
      llmUsage={llmUsage ?? []}
      dailyMetrics={dailyMetrics ?? []}
      todayTotalCost={totalDailyCost}
    />
  )
}
