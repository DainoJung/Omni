'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function DivisionActions({ divisionId, currentStatus }: { divisionId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [confirming, setConfirming] = useState(false)

  async function updateStatus(newStatus: string) {
    const supabase = createClient()
    await supabase.from('divisions').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', divisionId)
    setStatus(newStatus)
    setConfirming(false)
  }

  if (status === 'sunset') {
    return <span className="text-sm text-[var(--accent-red)]">Division 종료됨</span>
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'operating' && (
        <button
          onClick={() => updateStatus('paused')}
          className="px-3 py-1.5 text-sm border border-[var(--accent-yellow)] text-[var(--accent-yellow)] rounded-md hover:bg-[var(--accent-yellow)]/10 transition-colors"
        >
          Pause
        </button>
      )}
      {status === 'paused' && (
        <button
          onClick={() => updateStatus('operating')}
          className="px-3 py-1.5 text-sm border border-[var(--accent-green)] text-[var(--accent-green)] rounded-md hover:bg-[var(--accent-green)]/10 transition-colors"
        >
          Resume
        </button>
      )}
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="px-3 py-1.5 text-sm border border-[var(--accent-red)] text-[var(--accent-red)] rounded-md hover:bg-[var(--accent-red)]/10 transition-colors"
        >
          Sunset
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--accent-red)]">정말 종료?</span>
          <button onClick={() => updateStatus('sunset')} className="px-2 py-1 text-xs bg-[var(--accent-red)] text-white rounded">확인</button>
          <button onClick={() => setConfirming(false)} className="px-2 py-1 text-xs border border-[var(--border)] text-[var(--text-secondary)] rounded">취소</button>
        </div>
      )}
    </div>
  )
}
