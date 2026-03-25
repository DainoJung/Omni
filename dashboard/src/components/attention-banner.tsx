'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AttentionBannerProps {
  initialCount: number
}

export function AttentionBanner({ initialCount }: AttentionBannerProps) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('critical-decisions-banner')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'critical_decisions',
      }, () => {
        setCount((prev) => prev + 1)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'critical_decisions',
      }, (payload) => {
        const updated = payload.new as { status: string }
        if (updated.status === 'pending') {
          setCount((prev) => prev + 1)
        } else {
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
    <div className="w-full bg-[var(--accent-yellow)]/10 backdrop-blur-md border border-[var(--accent-yellow)]/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3 shadow-[0_8px_32px_rgba(210,153,34,0.15)]">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-[var(--accent-yellow)] flex-shrink-0" />
        <span className="text-sm font-medium text-[var(--accent-yellow)]">
          {count}건의 승인이 필요합니다
        </span>
      </div>
      <a
        href="/decisions"
        className="text-sm font-medium text-[var(--accent-yellow)] underline underline-offset-2 hover:opacity-80 transition-opacity flex-shrink-0"
      >
        Review
      </a>
    </div>
  )
}
