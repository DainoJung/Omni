'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Settings,
  Circle,
} from 'lucide-react'

interface AgentEvent {
  id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
  agents?: { name: string } | null
}

export function RealtimeEvents({ initialEvents }: { initialEvents: AgentEvent[] }) {
  const [events, setEvents] = useState<AgentEvent[]>(initialEvents)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('agent-events-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_events',
      }, (payload) => {
        const newEvent = payload.new as AgentEvent
        setEvents((prev) => [newEvent, ...prev].slice(0, 30))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
      {events.length > 0 ? (
        events.map((e) => (
          <div key={e.id} className="px-4 py-3 flex items-center gap-3 text-sm">
            <EventIcon type={e.event_type} />
            <span className="flex-1 truncate">{formatEventDescription(e)}</span>
            <span className="text-[var(--text-muted)] text-xs flex-shrink-0">
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
  )
}

function formatEventDescription(event: AgentEvent): string {
  const payload = event.payload ?? {}
  switch (event.event_type) {
    case 'build_progress':
      return `구축: ${String(payload.stepName ?? '')} (${String(payload.progress ?? '')}%)`
    case 'task_complete':
      return `${String(payload.action ?? event.event_type)} 완료`
    case 'task_error':
      return `오류: ${String(payload.detail ?? event.event_type)}`
    case 'task_start':
      return `${String(payload.action ?? '작업')} 시작`
    case 'escalation':
      return `에스컬레이션: ${String(payload.detail ?? '')}`
    default:
      return event.event_type
  }
}

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case 'task_start':
      return <Play className="w-4 h-4 text-[var(--accent-green)] flex-shrink-0" />
    case 'task_complete':
      return <CheckCircle2 className="w-4 h-4 text-[var(--accent-green)] flex-shrink-0" />
    case 'task_error':
      return <XCircle className="w-4 h-4 text-[var(--accent-red)] flex-shrink-0" />
    case 'escalation':
      return <AlertTriangle className="w-4 h-4 text-[var(--accent-yellow)] flex-shrink-0" />
    case 'message_sent':
      return <ArrowRight className="w-4 h-4 text-[var(--accent-blue)] flex-shrink-0" />
    case 'message_received':
      return <ArrowLeft className="w-4 h-4 text-[var(--accent-blue)] flex-shrink-0" />
    case 'build_progress':
      return <Settings className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 animate-spin" />
    default:
      return <Circle className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
  }
}
