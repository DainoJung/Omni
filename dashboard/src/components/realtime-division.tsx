'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, Play, AlertTriangle, ArrowRight, Settings, Circle, Clock, Activity } from 'lucide-react'

// --- Realtime Activity Feed ---

interface AgentEvent {
  id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
  agents?: { name: string } | null
}

function formatEvent(e: AgentEvent): string {
  const p = e.payload ?? {}
  switch (e.event_type) {
    case 'build_progress': return `구축: ${String(p.stepName ?? '')} (${String(p.progress ?? '')}%)`
    case 'task_complete': return `${String(p.action ?? e.event_type)} 완료`
    case 'task_error': return `오류: ${String(p.detail ?? e.event_type)}`
    case 'task_start': return `${String(p.action ?? '작업')} 시작`
    case 'escalation': return `에스컬레이션: ${String(p.detail ?? '')}`
    default: return e.event_type
  }
}

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case 'task_start': return <Play className="w-4 h-4 text-[var(--accent-green)] shrink-0" />
    case 'task_complete': return <CheckCircle2 className="w-4 h-4 text-[var(--accent-green)] shrink-0" />
    case 'task_error': return <XCircle className="w-4 h-4 text-[var(--accent-red)] shrink-0" />
    case 'escalation': return <AlertTriangle className="w-4 h-4 text-[var(--accent-yellow)] shrink-0" />
    case 'message_sent': return <ArrowRight className="w-4 h-4 text-[var(--accent-blue)] shrink-0" />
    case 'build_progress': return <Settings className="w-4 h-4 text-[var(--text-muted)] shrink-0 animate-spin" />
    default: return <Circle className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
  }
}

export function RealtimeActivity({ divisionId, initialEvents }: { divisionId: string; initialEvents: AgentEvent[] }) {
  const [events, setEvents] = useState<AgentEvent[]>(initialEvents)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`division-events-${divisionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_events',
        filter: `division_id=eq.${divisionId}`,
      }, (payload) => {
        setEvents(prev => [payload.new as AgentEvent, ...prev].slice(0, 30))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [divisionId])

  return (
    <section>
      <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Recent Activity
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
      </h3>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] max-h-[400px] overflow-y-auto">
        {events.length > 0 ? (
          events.map((e) => (
            <div key={e.id} className="px-4 py-3 flex items-center gap-3 text-sm">
              <EventIcon type={e.event_type} />
              <span className="flex-1 truncate">{formatEvent(e)}</span>
              <span className="flex items-center gap-1 text-[var(--text-muted)] text-xs shrink-0">
                <Clock className="w-3 h-3" />
                {new Date(e.created_at).toLocaleTimeString('ko-KR')}
              </span>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-[var(--text-secondary)]">
            아직 활동 기록이 없습니다
          </div>
        )}
      </div>
    </section>
  )
}

// --- Realtime Pipeline Outputs ---

interface PipelineOutput {
  id: string
  pipeline_run_id: string
  step_name: string
  step_order: number
  output_type: string
  output_data: Record<string, unknown>
  status: string
  created_at: string
  agents?: { name: string } | null
}

export function RealtimeOutputs({ divisionId, initialOutputs }: { divisionId: string; initialOutputs: PipelineOutput[] }) {
  const [outputs, setOutputs] = useState<PipelineOutput[]>(initialOutputs)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`division-outputs-${divisionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pipeline_outputs',
        filter: `division_id=eq.${divisionId}`,
      }, (payload) => {
        setOutputs(prev => [payload.new as PipelineOutput, ...prev].slice(0, 20))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [divisionId])

  if (outputs.length === 0) return null

  return (
    <section>
      <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Pipeline Outputs
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
      </h3>
      <div className="space-y-3">
        {outputs.map((o) => (
          <details key={o.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg overflow-hidden">
            <summary className="px-4 py-3 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] flex items-center justify-center text-xs font-medium">{o.step_order}</span>
                <span className="font-medium">{o.step_name}</span>
                <span className="text-xs text-[var(--text-muted)]">{o.output_type}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Clock className="w-3 h-3" />
                {new Date(o.created_at).toLocaleString('ko-KR')}
              </div>
            </summary>
            <div className="px-4 py-3 border-t border-[var(--border)]">
              <pre className="text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap overflow-auto max-h-64">
                {JSON.stringify(o.output_data, null, 2)}
              </pre>
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
