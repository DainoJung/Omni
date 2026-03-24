'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Option {
  label: string
  description: string
  recommended?: boolean
}

export function DecisionAction({
  decisionId,
  options,
  recommendation,
}: {
  decisionId: string
  options: Option[]
  recommendation: number | null
}) {
  const [deciding, setDeciding] = useState(false)
  const [note, setNote] = useState('')
  const router = useRouter()

  async function decide(optionIndex: number, status: 'approved' | 'rejected') {
    setDeciding(true)
    const supabase = createClient()
    await supabase.from('critical_decisions').update({
      status,
      decided_option: optionIndex,
      decided_note: note || null,
      decided_at: new Date().toISOString(),
    }).eq('id', decisionId)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {options.map((opt, i) => (
          <button
            key={i}
            disabled={deciding}
            onClick={() => decide(i, 'approved')}
            className={`px-3 py-1.5 rounded text-sm border transition-colors disabled:opacity-50 ${
              recommendation === i
                ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--accent-blue)]/10'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
            }`}
          >
            {opt.label}
            {recommendation === i && ' ★'}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="코멘트 (선택)"
          className="flex-1 px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder-[var(--text-muted)]"
        />
        <button
          disabled={deciding}
          onClick={() => decide(-1, 'rejected')}
          className="px-3 py-1.5 text-sm border border-[var(--accent-red)] text-[var(--accent-red)] rounded hover:bg-[var(--accent-red)]/10 disabled:opacity-50"
        >
          거부
        </button>
      </div>
    </div>
  )
}
