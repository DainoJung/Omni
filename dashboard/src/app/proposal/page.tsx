'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCcw, MessageSquare } from 'lucide-react'
import { DesignReview } from '@/components/design-review'

interface Proposal {
  id: string
  name: string
  slug: string
  description: string
  status: string
  proposal_text: string
  design_doc: Record<string, unknown>
  created_at: string
  updated_at: string
}

export default function ProposalPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProposals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/proposal')
      if (!res.ok) return
      const data = await res.json()
      setProposals(data.proposals || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchProposals() }, [fetchProposals])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Division 설계안</h2>
          <p className="text-sm text-[var(--text-secondary)]">진행 중인 설계안을 검토하고 승인합니다</p>
        </div>
        <button
          onClick={fetchProposals}
          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          title="새로고침"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Proposals List */}
      {loading ? (
        <div className="text-center py-12 text-sm text-[var(--text-muted)]">로딩 중...</div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <MessageSquare className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
          <p className="text-sm text-[var(--text-secondary)]">진행 중인 설계안이 없습니다</p>
          <p className="text-xs text-[var(--text-muted)]">
            우측 컨트롤타워 챗봇에서 사업 아이디어를 제안하면<br />
            시스템이 자동으로 Division을 설계합니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map(p => (
            <DesignReview
              key={p.id}
              divisionId={p.id}
              divisionName={p.name}
              proposalText={p.proposal_text}
              designDoc={p.design_doc as never}
              onUpdate={fetchProposals}
            />
          ))}
        </div>
      )}
    </div>
  )
}
