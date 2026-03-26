'use client'

import { useState } from 'react'
import { Activity, Clock, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react'

interface AgentEvent {
  id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

function EventItem({ event }: { event: AgentEvent }) {
  const [expanded, setExpanded] = useState(false)
  const hasPayload = event.payload && Object.keys(event.payload).length > 0
  const payloadStr = hasPayload ? JSON.stringify(event.payload, null, 2) : ''
  const isLong = payloadStr.length > 80

  return (
    <div className="px-4 py-3">
      <div
        className={`flex items-center justify-between ${isLong ? 'cursor-pointer' : ''}`}
        onClick={() => isLong && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {isLong && (
            expanded
              ? <ChevronUp size={10} className="text-[var(--text-muted)]" />
              : <ChevronDown size={10} className="text-[var(--text-muted)]" />
          )}
          <span className="text-[10px] font-[family-name:var(--font-mono)] font-bold uppercase">
            {event.event_type}
          </span>
          {'action' in event.payload && (
            <span className="text-[9px] font-[family-name:var(--font-mono)] text-[var(--text-muted)]">
              {String(event.payload.action)}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-[9px] font-[family-name:var(--font-mono)] text-[var(--text-muted)] shrink-0">
          <Clock size={10} />
          {new Date(event.created_at).toLocaleString('ko-KR')}
        </span>
      </div>
      {hasPayload && (
        expanded ? (
          <pre className="mt-1.5 text-[9px] font-[family-name:var(--font-mono)] text-[var(--text-muted)] whitespace-pre-wrap break-all bg-[var(--bg-tertiary)] rounded p-2 max-h-64 overflow-y-auto">
            {payloadStr}
          </pre>
        ) : (
          <pre className="mt-1.5 text-[9px] font-[family-name:var(--font-mono)] text-[var(--text-muted)] truncate">
            {JSON.stringify(event.payload)}
          </pre>
        )
      )}
    </div>
  )
}

export function EventLog({ events }: { events: AgentEvent[] }) {
  return (
    <div className="blueprint-card">
      <div className="blueprint-header flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Activity size={12} />
          <span>Event Log ({events.length})</span>
        </div>
        <ChevronRight size={12} className="opacity-40" />
      </div>
      <div className="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
        {events.length > 0 ? (
          events.map(e => <EventItem key={e.id} event={e} />)
        ) : (
          <div className="px-4 py-8 text-center text-[var(--text-muted)] text-[10px] font-[family-name:var(--font-mono)] uppercase">
            No events recorded
          </div>
        )}
      </div>
    </div>
  )
}
