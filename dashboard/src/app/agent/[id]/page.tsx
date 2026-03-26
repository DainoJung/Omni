import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Bot, Package, Activity, Clock, AlertCircle, Globe, Folder, ChevronRight, Cpu, Zap } from 'lucide-react'

interface Skill {
  id: string
  skill_name: string
  source: string
  version: string | null
  installed_at: string
}

interface AgentEvent {
  id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active' },
  inactive: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Inactive' },
  error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Error' },
  paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Paused' },
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: agent },
    { data: skills },
    { data: events },
  ] = await Promise.all([
    supabase.from('agents').select('*, divisions(name, slug)').eq('id', id).single(),
    supabase.from('agent_skills').select('*').eq('agent_id', id).order('installed_at'),
    supabase.from('agent_events').select('*').eq('agent_id', id).order('created_at', { ascending: false }).limit(50),
  ])

  if (!agent) notFound()

  const st = statusBadge[agent.status] ?? statusBadge.inactive

  return (
    <div className="p-4 space-y-4">
      {/* Header Card */}
      <div className="blueprint-card">
        <div className="blueprint-header flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Cpu size={14} />
            <span>Agent Detail</span>
          </div>
          <a
            href={`/division/${agent.division_id}`}
            className="!opacity-100 flex items-center gap-1 text-[10px] font-[family-name:var(--font-mono)] text-[var(--accent-blue)] hover:underline uppercase"
          >
            ← {agent.divisions?.name ?? 'Division'}
          </a>
        </div>
        <div className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            <Bot size={24} className="text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{agent.name}</h2>
              <span className={`text-[10px] font-[family-name:var(--font-mono)] uppercase px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
                {st.label}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{agent.role}</p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-4 gap-4">
        <InfoCard label="Model" value={agent.model} icon={<Cpu size={14} />} />
        <InfoCard label="OpenClaw ID" value={agent.openclaw_agent_id || '—'} icon={<Zap size={14} />} />
        <InfoCard
          label="Errors"
          value={String(agent.error_count)}
          icon={<AlertCircle size={14} />}
          highlight={agent.error_count > 0}
        />
        <InfoCard
          label="Last Active"
          value={agent.last_active_at ? new Date(agent.last_active_at).toLocaleString('ko-KR') : 'Never'}
          icon={<Clock size={14} />}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left: Skills + Schedule */}
        <div className="col-span-5 space-y-4">
          {/* Schedule */}
          {agent.schedule && (
            <div className="blueprint-card">
              <div className="blueprint-header flex items-center gap-2">
                <Clock size={12} />
                <span>Schedule</span>
              </div>
              <div className="p-4">
                <pre className="text-xs font-[family-name:var(--font-mono)] text-[var(--text-secondary)]">
                  {JSON.stringify(agent.schedule, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Skills Card */}
          <div className="blueprint-card">
            <div className="blueprint-header flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Package size={12} />
                <span>Skills ({skills?.length ?? 0})</span>
              </div>
              <ChevronRight size={12} className="opacity-40" />
            </div>
            <div className="p-4 space-y-2">
              {skills && skills.length > 0 ? (
                skills.map((s: Skill) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <Package size={12} className="text-[var(--text-muted)]" />
                      <span className="text-[10px] font-[family-name:var(--font-mono)] font-medium uppercase">
                        {s.skill_name}
                      </span>
                      {s.version && (
                        <span className="text-[9px] font-[family-name:var(--font-mono)] text-[var(--text-muted)]">
                          v{s.version}
                        </span>
                      )}
                    </div>
                    <span
                      className={`flex items-center gap-1 text-[9px] font-[family-name:var(--font-mono)] px-2 py-0.5 rounded-full ${
                        s.source === 'clawhub'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {s.source === 'clawhub' ? <Globe size={10} /> : <Folder size={10} />}
                      {s.source}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-[var(--text-muted)] text-[10px] font-[family-name:var(--font-mono)] uppercase">
                  No skills installed
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Event Log */}
        <div className="col-span-7">
          <div className="blueprint-card">
            <div className="blueprint-header flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Activity size={12} />
                <span>Event Log ({events?.length ?? 0})</span>
              </div>
              <ChevronRight size={12} className="opacity-40" />
            </div>
            <div className="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
              {events && events.length > 0 ? (
                events.map((e: AgentEvent) => (
                  <div key={e.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-[family-name:var(--font-mono)] font-bold uppercase">
                        {e.event_type}
                      </span>
                      <span className="flex items-center gap-1 text-[9px] font-[family-name:var(--font-mono)] text-[var(--text-muted)]">
                        <Clock size={10} />
                        {new Date(e.created_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    {e.payload && Object.keys(e.payload).length > 0 && (
                      <pre className="mt-1.5 text-[9px] font-[family-name:var(--font-mono)] text-[var(--text-muted)] truncate">
                        {JSON.stringify(e.payload)}
                      </pre>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-[var(--text-muted)] text-[10px] font-[family-name:var(--font-mono)] uppercase">
                  No events recorded
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {agent.error_count > 0 && (
        <div className="blueprint-card border-red-200 bg-red-50">
          <div className="p-3 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle size={16} />
            이 에이전트에 {agent.error_count}개의 오류가 기록되어 있습니다
          </div>
        </div>
      )}
    </div>
  )
}

function InfoCard({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string
  value: string
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className="blueprint-card">
      <div className="p-3 flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--text-muted)]">{icon}</span>
          <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase opacity-50">{label}</span>
        </div>
        <span className={`text-sm font-[family-name:var(--font-mono)] font-bold ${highlight ? 'text-red-600' : ''}`}>
          {value}
        </span>
      </div>
    </div>
  )
}
