import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DivisionActions } from '@/components/division-actions'
import { PipelineFlow } from '@/components/pipeline-flow'
import { Building2, Bot, Activity, Clock, AlertCircle } from 'lucide-react'
import { RealtimeActivity, RealtimeOutputs } from '@/components/realtime-division'

interface Agent {
  id: string
  name: string
  role: string
  model: string
  status: string
  last_active_at: string | null
  error_count: number
}

interface AgentEvent {
  id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
  agents: { name: string } | null
}

interface Pipeline {
  id: string
  trigger_type: string
  message_type: string
  from_agent: { name: string } | null
  to_agent: { name: string } | null
}

interface Metric {
  id: string
  metric_name: string
  metric_value: number
  period: string
  period_start: string
}

interface PipelineOutput {
  id: string
  pipeline_run_id: string
  step_name: string
  step_order: number
  output_type: string
  output_data: Record<string, unknown>
  status: string
  created_at: string
  agents: { name: string } | null
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'operating': return 'var(--accent-green)'
    case 'building': return 'var(--accent-blue)'
    case 'designing': return 'var(--accent-purple)'
    case 'proposed': return 'var(--text-muted)'
    case 'paused': return 'var(--accent-yellow)'
    case 'sunset': return 'var(--accent-red)'
    default: return 'var(--text-muted)'
  }
}

export default async function DivisionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: division },
    { data: agents },
    { data: events },
    { data: pipelines },
    { data: metrics },
    { data: outputs },
  ] = await Promise.all([
    supabase.from('divisions').select('*').eq('id', id).single(),
    supabase.from('agents').select('*').eq('division_id', id).order('created_at'),
    supabase.from('agent_events').select('*, agents(name)').eq('division_id', id).order('created_at', { ascending: false }).limit(30),
    supabase.from('division_pipelines').select('*, from_agent:from_agent_id(name), to_agent:to_agent_id(name)').eq('division_id', id),
    supabase.from('division_metrics').select('*').eq('division_id', id).eq('period', 'daily').order('period_start', { ascending: false }).limit(5),
    supabase.from('pipeline_outputs').select('*, agents(name)').eq('division_id', id).order('created_at', { ascending: false }).limit(10),
  ])

  if (!division) notFound()

  const statusColor = getStatusColor(division.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `color-mix(in srgb, ${statusColor} 20%, transparent)` }}
          >
            <Building2 className="w-5 h-5" style={{ color: statusColor }} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{division.name}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{division.description}</p>
          </div>
        </div>
        <DivisionActions divisionId={division.id} currentStatus={division.status} />
      </header>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Pipeline + Metrics */}
        <div className="space-y-6">
          {/* Pipeline */}
          <section>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
              Pipeline
            </h3>
            <PipelineFlow
              agents={agents ?? []}
              pipelines={pipelines ?? []}
              direction="vertical"
            />
          </section>

          {/* Metrics */}
          {metrics && metrics.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                Daily Metrics
              </h3>
              <div className="space-y-2">
                {metrics.map((m: Metric) => (
                  <div
                    key={m.id}
                    className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg flex items-center justify-between"
                  >
                    <span className="text-xs text-[var(--text-secondary)]">{m.metric_name}</span>
                    <span className="text-sm font-mono font-medium">{m.metric_value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column: Agents + Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Agents */}
          <section>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Agents ({agents?.length ?? 0})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {agents?.map((agent: Agent) => (
                <a
                  key={agent.id}
                  href={`/agent/${agent.id}`}
                  className="block p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg hover:border-[var(--accent-blue)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[var(--text-muted)]" />
                      <h4 className="font-medium text-sm">{agent.name}</h4>
                    </div>
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      agent.status === 'active' ? 'bg-[var(--accent-green)]' :
                      agent.status === 'error' ? 'bg-[var(--accent-red)]' :
                      'bg-[var(--text-muted)]'
                    }`} />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">{agent.role}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-[var(--text-muted)]">
                    <span>{agent.model}</span>
                    {agent.error_count > 0 && (
                      <span className="flex items-center gap-1 text-[var(--accent-red)]">
                        <AlertCircle className="w-3 h-3" />
                        {agent.error_count}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Pipeline Outputs (Realtime) */}
          <RealtimeOutputs divisionId={id} initialOutputs={outputs ?? []} />

          {/* Recent Activity (Realtime) */}
          <RealtimeActivity divisionId={id} initialEvents={events ?? []} />

          {/* Design Doc */}
          {division.design_doc && (
            <section>
              <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                Design Document
              </h3>
              <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
                <pre className="text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap overflow-auto max-h-96">
                  {JSON.stringify(division.design_doc, null, 2)}
                </pre>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
