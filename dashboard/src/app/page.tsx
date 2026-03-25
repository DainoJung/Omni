import { createClient } from '@/lib/supabase/server'
import { KpiStrip } from '@/components/kpi-strip'
import { AttentionBanner } from '@/components/attention-banner'
import { RealtimeEvents } from '@/components/realtime-events'
import { Bot } from 'lucide-react'

interface Division {
  id: string
  name: string
  slug: string
  status: string
  description: string | null
  created_at: string
  agents: { id: string }[]
}

interface AgentEvent {
  id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
  agents: { name: string } | null
}

interface CriticalDecision {
  id: string
  title: string
  priority: string
  status: string
  created_at: string
}

interface DivisionMetric {
  metric_value: number
}

const STATUS_DOT: Record<string, string> = {
  operating: 'bg-[var(--accent-green)]',
  building: 'bg-[var(--accent-blue)]',
  designing: 'bg-[var(--accent-purple)]',
  proposed: 'bg-[var(--text-muted)]',
  paused: 'bg-[var(--accent-yellow)]',
  sunset: 'bg-[var(--accent-red)]',
}

const STATUS_LABEL: Record<string, string> = {
  operating: 'Operating',
  building: 'Building',
  designing: 'Designing',
  proposed: 'Proposed',
  paused: 'Paused',
  sunset: 'Sunset',
}

export default async function CommandCenter() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { data: divisions },
    { data: recentEvents },
    { data: pendingDecisions },
    { count: totalAgents },
    { count: todayEvents },
    { data: costRows },
  ] = await Promise.all([
    supabase.from('divisions').select('*, agents(id)').order('created_at', { ascending: false }),
    supabase.from('agent_events').select('*, agents(name)').order('created_at', { ascending: false }).limit(20),
    supabase.from('critical_decisions').select('*').eq('status', 'pending'),
    supabase.from('agents').select('id', { count: 'exact', head: true }),
    supabase.from('agent_events').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabase
      .from('division_metrics')
      .select('metric_value')
      .eq('metric_name', 'api_cost')
      .eq('period', 'daily')
      .eq('period_start', new Date().toISOString().split('T')[0]),
  ])

  const activeDivisions = (divisions as Division[] | null)?.filter(
    (d) => d.status === 'operating'
  ).length ?? 0

  const dailyCost = (costRows as DivisionMetric[] | null)?.reduce(
    (sum, row) => sum + (row.metric_value ?? 0),
    0
  ) ?? 0

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <KpiStrip
        activeDivisions={activeDivisions}
        totalAgents={totalAgents ?? 0}
        todayEvents={todayEvents ?? 0}
        pendingDecisions={pendingDecisions?.length ?? 0}
        dailyCost={dailyCost}
      />

      {/* Attention Banner */}
      <AttentionBanner initialCount={pendingDecisions?.length ?? 0} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Divisions (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Divisions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {divisions && (divisions as Division[]).length > 0 ? (
              (divisions as Division[]).map((d) => (
                <a
                  key={d.id}
                  href={`/division/${d.id}`}
                  className="block p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg hover:border-[var(--accent-blue)] hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(88,166,255,0.12)] transition-all duration-300"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[d.status] ?? STATUS_DOT.proposed}`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium leading-tight">{d.name}</p>
                      {d.description && (
                        <p className="text-sm text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                          {d.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5" />
                      {d.agents?.length ?? 0} agents
                    </span>
                    <span>{STATUS_LABEL[d.status] ?? d.status}</span>
                  </div>
                </a>
              ))
            ) : (
              <div className="col-span-full p-8 text-center bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
                <p className="text-[var(--text-secondary)]">아직 Division이 없습니다</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  &quot;블로그 사업 하고 싶어&quot; — 새 Division을 제안해보세요
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Activity Feed (1/3) */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
            Recent Activity
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
          </h3>
          <RealtimeEvents initialEvents={(recentEvents as AgentEvent[] | null) ?? []} />
        </div>
      </div>
    </div>
  )
}
