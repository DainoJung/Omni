'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlusCircle, Send, Loader2, RefreshCcw, MessageSquare } from 'lucide-react'
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
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [proposal, setProposal] = useState('')
  const [targetMarket, setTargetMarket] = useState('')
  const [revenueModel, setRevenueModel] = useState('')
  const [budget, setBudget] = useState('')

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch('/api/proposal')
      if (!res.ok) return
      const data = await res.json()
      setProposals(data.proposals || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchProposals() }, [fetchProposals])

  const handleSubmit = async () => {
    if (!proposal.trim() || submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal: proposal.trim(),
          targetMarket: targetMarket.trim() || undefined,
          revenueModel: revenueModel.trim() || undefined,
          budget: budget.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '제안 실패')

      // 성공 → 폼 초기화 + 목록 새로고침
      setProposal('')
      setTargetMarket('')
      setRevenueModel('')
      setBudget('')
      setShowForm(false)
      await fetchProposals()
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Division 제안</h2>
          <p className="text-sm text-[var(--text-secondary)]">사업 아이디어를 제안하고 설계안을 검토합니다</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchProposals}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            title="새로고침"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[var(--accent-blue)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <PlusCircle className="w-4 h-4" />
            새 제안
          </button>
        </div>
      </div>

      {/* Proposal Form */}
      {showForm && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-medium">새 사업 제안</h3>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
              사업 아이디어 <span className="text-[var(--accent-red)]">*</span>
            </label>
            <textarea
              value={proposal}
              onChange={e => setProposal(e.target.value)}
              placeholder="어떤 사업을 하고 싶은지 자유롭게 설명해주세요..."
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm resize-none focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1.5">타겟 고객</label>
              <input
                value={targetMarket}
                onChange={e => setTargetMarket(e.target.value)}
                placeholder="e.g. 20~30대 직장인"
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1.5">수익 모델</label>
              <input
                value={revenueModel}
                onChange={e => setRevenueModel(e.target.value)}
                placeholder="e.g. 광고, 구독, 커머스"
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1.5">월 예산</label>
              <input
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="e.g. ₩100,000"
                className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 bg-[var(--accent-red)]/10 text-[var(--accent-red)] text-xs rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || !proposal.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[var(--accent-blue)] text-white rounded-lg hover:opacity-90 disabled:opacity-30 transition-opacity"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Builder 분석 중...' : '제안하기'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(null) }}
              className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              취소
            </button>
          </div>

          {submitting && (
            <p className="text-xs text-[var(--text-muted)]">
              시스템 현황 조회 → Memory 검색 → Builder 설계 중... (최대 3분 소요)
            </p>
          )}
        </div>
      )}

      {/* Proposals List */}
      {proposals.length === 0 && !showForm ? (
        <div className="text-center py-16 space-y-3">
          <MessageSquare className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
          <p className="text-sm text-[var(--text-secondary)]">진행 중인 제안이 없습니다</p>
          <p className="text-xs text-[var(--text-muted)]">
            &quot;새 제안&quot; 버튼으로 사업 아이디어를 제안하거나,<br />
            우측 컨트롤타워 챗봇에서 대화로 시작할 수 있습니다.
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
