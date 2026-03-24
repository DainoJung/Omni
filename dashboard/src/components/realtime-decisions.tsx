'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Decision {
  id: string
  title: string
  priority: string
  status: string
  created_at: string
}

export function RealtimeDecisions({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('decisions-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'critical_decisions',
        filter: 'status=eq.pending',
      }, () => {
        setCount((prev) => prev + 1)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'critical_decisions',
      }, (payload) => {
        const updated = payload.new as Decision
        if (updated.status !== 'pending') {
          setCount((prev) => Math.max(0, prev - 1))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (count === 0) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/30 rounded-md text-sm">
      <span className="text-[var(--accent-yellow)]">⚠</span>
      <span className="text-[var(--accent-yellow)]">{count}건의 승인 대기 중</span>
    </div>
  )
}
