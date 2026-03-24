import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Bot, Package, Activity, Clock, AlertCircle, Globe, Folder } from 'lucide-react'

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

  const statusConfig: Record<string, { color: string; label: string }> = {
    active: { color: 'bg-[var(--accent-green)]', label: 'Active' },
    inactive: { color: 'bg-[var(--text-muted)]', label: 'Inactive' },
    error: { color: 'bg-[var(--accent-red)]', label: 'Error' },
    paused: { color: 'bg-[var(--accent-yellow)]', label: 'Paused' },
  }

  const st = statusConfig[agent.status] ?? statusConfig.inactive

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-3">
          <a href={`/division/${agent.division_id}`} className="hover:text-[var(--text-secondary)]">
            ← {agent.divisions?.name ?? 'Division'}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center">
            <Bot className="w-5 h-5 text-[var(--text-secondary)]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{agent.name}</h2>
              <span className="flex items-center gap-1.5 text-sm">
                <span className={`inline-block w-2 h-2 rounded-full ${st.color}`} />
                {st.label}
              </span>
            </div>
            <p className="text-[var(--text-secondary)] text-sm">{agent.role}</p>
          </div>
        </div>
      </header>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard label="Model" value={agent.model} />
        <InfoCard label="OpenClaw ID" value={agent.openclaw_agent_id} />
        <InfoCard label="Errors" value={String(agent.error_count)} highlight={agent.error_count > 0} />
        <InfoCard
          label="Last Active"
          value={agent.last_active_at ? new Date(agent.last_active_at).toLocaleString('ko-KR') : 'Never'}
        />
      </div>

      {/* Schedule */}
      {agent.schedule && (
        <section>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Schedule
          </h3>
          <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm font-mono">
            {JSON.stringify(agent.schedule)}
          </div>
        </section>
      )}

      {/* Skills */}
      <section>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Skills ({skills?.length ?? 0})
        </h3>
        {skills && skills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {skills.map((s: Skill) => (
              <div
                key={s.id}
                className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[var(--text-muted)]" />
                  <div>
                    <span className="text-sm font-medium">{s.skill_name}</span>
                    {s.version && (
                      <span className="ml-2 text-xs text-[var(--text-muted)]">v{s.version}</span>
                    )}
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                  s.source === 'clawhub'
                    ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]'
                    : 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]'
                }`}>
                  {s.source === 'clawhub' ? (
                    <Globe className="w-3 h-3" />
                  ) : (
                    <Folder className="w-3 h-3" />
                  )}
                  {s.source}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)]">
            설치된 스킬이 없습니다
          </div>
        )}
      </section>

      {/* Events */}
      <section>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Event Log
        </h3>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
          {events && events.length > 0 ? (
            events.map((e: AgentEvent) => (
              <div key={e.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{e.event_type}</span>
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <Clock className="w-3 h-3" />
                    {new Date(e.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                {e.payload && Object.keys(e.payload).length > 0 && (
                  <pre className="mt-1 text-xs text-[var(--text-muted)] font-mono truncate">
                    {JSON.stringify(e.payload)}
                  </pre>
                )}
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-[var(--text-secondary)]">
              이벤트 기록이 없습니다
            </div>
          )}
        </div>
      </section>

      {/* Error count callout if relevant */}
      {agent.error_count > 0 && (
        <div className="flex items-center gap-2 p-3 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-lg text-sm text-[var(--accent-red)]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          이 에이전트에 {agent.error_count}개의 오류가 기록되어 있습니다
        </div>
      )}
    </div>
  )
}

function InfoCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-[var(--accent-red)]' : ''}`}>
        {value}
      </p>
    </div>
  )
}
