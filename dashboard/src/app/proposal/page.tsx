'use client'

import { useState } from 'react'
import { Check, CheckCircle2, XCircle } from 'lucide-react'

type Step = 1 | 2 | 3 | 4 | 5

interface FollowUp {
  targetMarket: string
  revenueModel: string
  budget: string
}

const TOTAL_STEPS = 5

function ProgressIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2">
      {([1, 2, 3, 4, 5] as Step[]).map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              step < current
                ? 'bg-[var(--accent-blue)] text-white'
                : step === current
                ? 'border-2 border-[var(--accent-blue)] text-[var(--accent-blue)]'
                : 'border border-[var(--border)] text-[var(--text-muted)]'
            }`}
          >
            {step < current ? <Check className="w-3 h-3" /> : step}
          </div>
          {step < TOTAL_STEPS && (
            <div
              className={`h-px w-8 transition-colors ${
                step < current ? 'bg-[var(--accent-blue)]' : 'bg-[var(--border)]'
              }`}
            />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-[var(--text-muted)]">{current}/{TOTAL_STEPS}</span>
    </div>
  )
}

export default function ProposalPage() {
  const [step, setStep] = useState<Step>(1)
  const [proposal, setProposal] = useState('')
  const [followUp, setFollowUp] = useState<FollowUp>({
    targetMarket: '',
    revenueModel: '',
    budget: '',
  })
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [building, setBuilding] = useState(false)
  const [buildResult, setBuildResult] = useState<{ success: boolean; divisionId?: string; error?: string } | null>(null)

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault()
    if (!proposal.trim()) return
    setStep(2)
  }

  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault()
    setStep(3)
    setError(null)

    try {
      const res = await fetch('/api/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal,
          targetMarket: followUp.targetMarket,
          revenueModel: followUp.revenueModel,
          budget: followUp.budget,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Division Builder 연결 실패')
        setStep(2)
        return
      }

      setResult(data.result)
      setStep(4)
    } catch (err) {
      setError(`연결 오류: ${String(err)}`)
      setStep(2)
    }
  }

  async function handleApprove() {
    setBuilding(true)
    setStep(5)
    setError(null)

    const slug = proposal
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 30)

    const name = `Division — ${proposal.slice(0, 40)}`

    try {
      const res = await fetch('/api/division/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: `division-${slug}-${Date.now().toString(36)}`,
          description: proposal,
          proposalText: [
            proposal,
            followUp.targetMarket && `타겟: ${followUp.targetMarket}`,
            followUp.revenueModel && `수익: ${followUp.revenueModel}`,
            followUp.budget && `예산: ${followUp.budget}`,
          ].filter(Boolean).join('. '),
          designDoc: { builderResponse: result },
          agents: [
            { id: `researcher-${slug.slice(0, 10)}`, name: 'Researcher', role: '시장 조사 + 트렌드 분석', model: 'openai/gpt-5.4-mini', schedule: { type: 'cron', expression: '0 */2 * * *' } },
            { id: `writer-${slug.slice(0, 10)}`, name: 'Writer', role: '콘텐츠 작성 + SEO 최적화', model: 'openai/gpt-5.4-mini', schedule: { type: 'event-driven', trigger: 'research_result' } },
            { id: `publisher-${slug.slice(0, 10)}`, name: 'Publisher', role: '발행 + 성과 추적', model: 'openai/gpt-5.4-mini', schedule: { type: 'event-driven', trigger: 'write_result' } },
          ],
          pipeline: [
            { fromAgentId: `researcher-${slug.slice(0, 10)}`, toAgentId: `writer-${slug.slice(0, 10)}`, triggerType: 'event', messageType: 'research_result' },
            { fromAgentId: `writer-${slug.slice(0, 10)}`, toAgentId: `publisher-${slug.slice(0, 10)}`, triggerType: 'event', messageType: 'write_result' },
          ],
          workspacePath: `/Users/jungdain/Desktop/omni/agents`,
        }),
      })

      const data = await res.json()
      setBuildResult(data)
    } catch (err) {
      setBuildResult({ success: false, error: String(err) })
    } finally {
      setBuilding(false)
    }
  }

  function handleReset() {
    setStep(1)
    setProposal('')
    setFollowUp({ targetMarket: '', revenueModel: '', budget: '' })
    setResult(null)
    setBuildResult(null)
    setError(null)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <h2 className="text-2xl font-bold">New Division</h2>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          사업을 제안하면 시스템이 Division을 설계합니다
        </p>
      </header>

      <div className="p-5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg space-y-6">
        <ProgressIndicator current={step} />

        {/* Step 1: Business Proposal */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                어떤 사업을 해보고 싶으세요?
              </label>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                구체적일수록 더 정확한 Division을 설계할 수 있습니다
              </p>
              <textarea
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                placeholder="예: 블로그 + 제휴마케팅 사업을 해보고 싶어. 레시피 중심으로."
                rows={5}
                className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors resize-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!proposal.trim()}
                className="px-6 py-2.5 bg-[var(--accent-blue)] text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                다음 →
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Follow-up Questions */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-5">
            <div>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                조금 더 알려주시면 더 정확한 설계가 가능합니다 (선택사항)
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    타겟 고객
                  </label>
                  <input
                    type="text"
                    value={followUp.targetMarket}
                    onChange={(e) => setFollowUp((f) => ({ ...f, targetMarket: e.target.value }))}
                    placeholder="예: 20-30대 요리 초보자"
                    className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    수익 모델
                  </label>
                  <input
                    type="text"
                    value={followUp.revenueModel}
                    onChange={(e) => setFollowUp((f) => ({ ...f, revenueModel: e.target.value }))}
                    placeholder="예: 쿠팡파트너스 + 애드센스"
                    className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    월 예산
                  </label>
                  <input
                    type="text"
                    value={followUp.budget}
                    onChange={(e) => setFollowUp((f) => ({ ...f, budget: e.target.value }))}
                    placeholder="예: ₩50,000 / 월"
                    className="w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                ← 이전
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[var(--accent-blue)] text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Division 설계 시작
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Loading / Analysis */}
        {step === 3 && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
              <div className="absolute inset-0 rounded-full border-2 border-t-[var(--accent-blue)] animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Division Builder가 분석 중...
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                ClawHub 스킬 탐색 · 에이전트 구성 설계 · 파이프라인 초안 생성
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-md bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30">
            <p className="text-sm text-[var(--accent-red)]">{error}</p>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && result && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[var(--accent-green)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">Division 설계 완료</h3>
            </div>

            <div className="p-5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-[var(--text-secondary)]">
                {result}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                ← 새 제안 시작
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="px-6 py-2.5 bg-[var(--accent-green)] text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Division 구축 승인
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Building */}
        {step === 5 && (
          <div className="space-y-5">
            {building ? (
              <div className="py-8 flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-2 border-[var(--border)]" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-[var(--accent-green)] animate-spin" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">Division 구축 중...</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    DB 등록 → 에이전트 생성 → 파이프라인 → Gateway 재시작 → 활성화
                  </p>
                </div>
              </div>
            ) : buildResult?.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[var(--accent-green)]" />
                  <h3 className="font-semibold">Division 구축 완료!</h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Division이 operating 상태로 활성화되었습니다.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <a
                    href={`/division/${buildResult.divisionId}`}
                    className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Division 보기
                  </a>
                  <a href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    Command Center
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-[var(--accent-red)]" />
                  <h3 className="font-semibold">구축 실패</h3>
                </div>
                <p className="text-sm text-[var(--accent-red)]">{buildResult?.error}</p>
                <button
                  type="button"
                  onClick={() => { setStep(4); setBuildResult(null) }}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  ← 설계안으로 돌아가기
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
