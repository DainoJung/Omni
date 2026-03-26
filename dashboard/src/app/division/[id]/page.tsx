import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DivisionActions } from '@/components/division-actions'
import { PipelineFlow } from '@/components/pipeline-flow'
import { Building2, Bot, Activity, Clock, AlertCircle, BarChart3, ChevronRight, Network } from 'lucide-react'
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

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  operating: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Operating' },
  building: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Building' },
  designing: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Designing' },
  proposed: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Proposed' },
  paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Paused' },
  sunset: { bg: 'bg-red-100', text: 'text-red-700', label: 'Sunset' },
}

const agentStatusDot: Record<string, string> = {
  active: 'bg-emerald-500',
  inactive: 'bg-slate-400',
  error: 'bg-red-500',
  paused: 'bg-yellow-500',
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

  const st = statusBadge[division.status] ?? statusBadge.proposed

  return (
    <div className="p-4 space-y-4">
      {/* Header Card */}
      <div className="blueprint-card">
        <div className="blueprint-header flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Building2 size={14} />
            <span>Division Overview</span>
          </div>
          <ChevronRight size={12} className="opacity-40" />
        </div>
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center">
              <Network size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{division.name}</h2>
              {division.description && (
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{division.description}</p>
              )}
            </div>
            <span className={`ml-3 text-[10px] font-[family-name:var(--font-mono)] uppercase px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
              {st.label}
            </span>
          </div>
          <DivisionActions divisionId={division.id} currentStatus={division.status} />
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Agents" value={String(agents?.length ?? 0)} />
        <StatCard label="Pipelines" value={String(pipelines?.length ?? 0)} />
        <StatCard label="Events (recent)" value={String(events?.length ?? 0)} />
        <StatCard label="Outputs" value={String(outputs?.length ?? 0)} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left: Pipeline + Metrics */}
        <div className="col-span-4 space-y-4">
          {/* Pipeline Card */}
          <div className="blueprint-card">
            <div className="blueprint-header flex items-center gap-2">
              <Network size={12} />
              <span>Pipeline Flow</span>
            </div>
            <div className="p-4">
              <PipelineFlow
                agents={agents ?? []}
                pipelines={pipelines ?? []}
                direction="vertical"
              />
            </div>
          </div>

          {/* Metrics Card */}
          {metrics && metrics.length > 0 && (
            <div className="blueprint-card">
              <div className="blueprint-header flex items-center gap-2">
                <BarChart3 size={12} />
                <span>Daily Metrics</span>
              </div>
              <div className="p-4 space-y-2">
                {metrics.map((m: Metric) => (
                  <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-b-0">
                    <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase opacity-50">{m.metric_name}</span>
                    <span className="text-xs font-[family-name:var(--font-mono)] font-bold">{m.metric_value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Agents + Activity */}
        <div className="col-span-8 space-y-4">
          {/* Agents Card */}
          <div className="blueprint-card">
            <div className="blueprint-header flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot size={12} />
                <span>Agents ({agents?.length ?? 0})</span>
              </div>
              <ChevronRight size={12} className="opacity-40" />
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {agents?.map((agent: Agent) => (
                  <a
                    key={agent.id}
                    href={`/agent/${agent.id}`}
                    className="border border-[var(--border)] rounded-lg p-3 hover:border-[var(--accent-blue)] hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Bot size={14} className="text-[var(--text-muted)] group-hover:text-[var(--accent-blue)] transition-colors" />
                        <h4 className="text-sm font-medium">{agent.name}</h4>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${agentStatusDot[agent.status] ?? 'bg-slate-400'}`} />
                    </div>
                    <p className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--text-secondary)] uppercase">{agent.role}</p>
                    <div className="flex items-center gap-3 mt-2 text-[9px] font-[family-name:var(--font-mono)] text-[var(--text-muted)] uppercase">
                      <span>{agent.model}</span>
                      {agent.error_count > 0 && (
                        <span className="flex items-center gap-1 text-red-500">
                          <AlertCircle size={10} />
                          {agent.error_count}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
                {(!agents || agents.length === 0) && (
                  <div className="col-span-full text-center py-6 text-[var(--text-muted)] text-sm">
                    No agents configured
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pipeline Outputs */}
          <div className="blueprint-card">
            <div className="blueprint-header flex items-center gap-2">
              <Activity size={12} />
              <span>Pipeline Outputs</span>
            </div>
            <div className="p-4">
              <RealtimeOutputs divisionId={id} initialOutputs={outputs ?? []} />
            </div>
          </div>

          {/* Activity Feed */}
          <div className="blueprint-card">
            <div className="blueprint-header flex items-center gap-2">
              <Clock size={12} />
              <span>Recent Activity</span>
            </div>
            <div className="p-4">
              <RealtimeActivity divisionId={id} initialEvents={events ?? []} />
            </div>
          </div>

          {/* Design Doc */}
          {division.design_doc && (
            <div className="blueprint-card">
              <div className="blueprint-header flex items-center gap-2">
                <Building2 size={12} />
                <span>Design Document</span>
              </div>
              <div className="p-4">
                <pre className="text-xs font-[family-name:var(--font-mono)] text-[var(--text-secondary)] whitespace-pre-wrap overflow-auto max-h-96">
                  {JSON.stringify(division.design_doc, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="blueprint-card">
      <div className="p-3 flex flex-col items-center">
        <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase opacity-50 mb-1">{label}</span>
        <span className="text-lg font-[family-name:var(--font-mono)] font-bold">{value}</span>
      </div>
    </div>
  )
}
