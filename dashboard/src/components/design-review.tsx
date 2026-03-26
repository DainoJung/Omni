'use client'

import { useState } from 'react'
import {
  CheckCircle2, XCircle, MessageSquare, Send, Loader2,
  Bot, ArrowRight, DollarSign, Lightbulb, Link2, Zap,
  ChevronDown, ChevronUp,
} from 'lucide-react'

// ── Types ──

interface Capability {
  name: string
  description: string
  matchedSkill: string | null
  skillSource: string | null
  status: string
}

interface AgentRequirement {
  type: string
  service: string
  env: string
  required?: boolean
  description?: string
  setupUrl?: string
}

interface AgentSpec {
  id: string
  name: string
  role: string
  model: string
  skills: string[]
  schedule: { type: string; expression?: string }
  requirements?: AgentRequirement[]
}

interface PipelineStep {
  from: string
  to: string
  triggerType: string
  messageType: string
  dataFlow: string
}

interface Synergy {
  existingDivision: string
  type: string
  description: string
}

interface Lesson {
  memory: string
  application: string
}

interface DivisionDesign {
  version: number
  business: { description: string; targetMarket: string; revenueModel: string }
  capabilities: Capability[]
  agents: AgentSpec[]
  pipeline: PipelineStep[]
  synergies: Synergy[]
  appliedLessons: Lesson[]
  costEstimate: { monthly: number; breakdown: Record<string, number> }
  parseError?: boolean
  raw?: string
}

interface DesignReviewProps {
  divisionId: string
  divisionName: string
  proposalText: string
  designDoc: DivisionDesign
  onUpdate?: () => void
}

// ── Component ──

export function DesignReview({ divisionId, divisionName, proposalText, designDoc, onUpdate }: DesignReviewProps) {
  const [feedbackMode, setFeedbackMode] = useState(false)
  const [setupMode, setSetupMode] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({})
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    capabilities: true,
    agents: true,
    pipeline: true,
    synergies: false,
    lessons: false,
    cost: true,
  })

  // 모든 에이전트의 requirements를 수집
  const allRequirements: Array<AgentRequirement & { agentName: string }> = []
  if (designDoc.agents) {
    for (const agent of designDoc.agents) {
      for (const req of (agent.requirements || [])) {
        if (req.type !== 'none' && !allRequirements.find(r => r.env === req.env)) {
          allRequirements.push({ ...req, agentName: agent.name })
        }
      }
    }
  }
  const requiredCount = allRequirements.filter(r => r.required !== false).length
  const filledCount = allRequirements.filter(r => r.required !== false && credentialValues[r.env]?.trim()).length
  const allRequiredFilled = requiredCount === 0 || filledCount >= requiredCount

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // 설계안 파싱 실패 시
  if (designDoc.parseError || !designDoc.agents) {
    return (
      <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
        <p className="text-sm text-[var(--accent-yellow)] mb-2">설계안을 구조화하지 못했습니다.</p>
        {designDoc.raw && (
          <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap max-h-96 overflow-auto">
            {designDoc.raw}
          </pre>
        )}
      </div>
    )
  }

  const handleApprove = () => {
    if (allRequirements.length > 0) {
      // requirements가 있으면 셋업 위자드로 진입
      setSetupMode(true)
      setFeedbackMode(false)
      setError(null)
    } else {
      // requirements가 없으면 바로 빌드
      handleBuild()
    }
  }

  const handleBuild = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. credentials 저장
      for (const req of allRequirements) {
        const value = credentialValues[req.env]?.trim()
        if (value) {
          await fetch('/api/agent/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              divisionId,
              service: req.service,
              type: req.type,
              envKey: req.env,
              envValue: value,
              setupUrl: req.setupUrl,
              description: req.description,
              required: req.required,
            }),
          })
        }
      }

      // 2. approve → 빌드 트리거
      const res = await fetch('/api/proposal/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ divisionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '승인 실패')
      setSetupMode(false)
      onUpdate?.()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async () => {
    if (!feedback.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/proposal/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ divisionId, feedback }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '피드백 처리 실패')
      setFeedback('')
      setFeedbackMode(false)
      onUpdate?.()
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const SectionHeader = ({ id, icon, title, count }: { id: string; icon: React.ReactNode; title: string; count?: number }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center gap-2 w-full text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider py-2 hover:text-[var(--text-primary)] transition-colors"
    >
      {icon}
      <span>{title}</span>
      {count !== undefined && <span className="text-[var(--text-muted)]">({count})</span>}
      <span className="ml-auto">
        {expandedSections[id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </span>
    </button>
  )

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">{divisionName}</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">설계안 v{designDoc.version}</p>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]">
            designing
          </span>
        </div>
        {proposalText && (
          <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">{proposalText}</p>
        )}
      </div>

      <div className="p-4 space-y-1">
        {/* Business */}
        {designDoc.business && (
          <div className="mb-3 p-3 bg-[var(--bg-primary)] rounded-md">
            <p className="text-sm font-medium">{designDoc.business.description}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--text-muted)]">
              {designDoc.business.targetMarket && <span>타겟: {designDoc.business.targetMarket}</span>}
              {designDoc.business.revenueModel && <span>수익: {designDoc.business.revenueModel}</span>}
            </div>
          </div>
        )}

        {/* Capabilities */}
        <SectionHeader id="capabilities" icon={<Zap className="w-3.5 h-3.5" />} title="역량 분석" count={designDoc.capabilities?.length} />
        {expandedSections.capabilities && designDoc.capabilities && (
          <div className="space-y-1.5 pb-3">
            {designDoc.capabilities.map((cap, i) => (
              <div key={i} className="flex items-start gap-2 pl-2 text-xs">
                {cap.status === 'matched'
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-green)] shrink-0 mt-0.5" />
                  : <Zap className="w-3.5 h-3.5 text-[var(--accent-yellow)] shrink-0 mt-0.5" />}
                <div>
                  <span className="font-medium">{cap.name}</span>
                  <span className="text-[var(--text-muted)]">
                    {' → '}{cap.matchedSkill || '자동 생성'}
                    {cap.skillSource && ` (${cap.skillSource})`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Agents */}
        <SectionHeader id="agents" icon={<Bot className="w-3.5 h-3.5" />} title="에이전트 구성" count={designDoc.agents?.length} />
        {expandedSections.agents && designDoc.agents && (
          <div className="space-y-2 pb-3">
            {designDoc.agents.map((agent, i) => (
              <div key={i} className="p-2.5 bg-[var(--bg-primary)] rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{agent.name}</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">{agent.model}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{agent.role}</p>
                {agent.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {agent.skills.map((s, j) => (
                      <span key={j} className="px-1.5 py-0.5 text-[10px] bg-[var(--bg-tertiary)] rounded">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pipeline */}
        <SectionHeader id="pipeline" icon={<ArrowRight className="w-3.5 h-3.5" />} title="파이프라인" count={designDoc.pipeline?.length} />
        {expandedSections.pipeline && designDoc.pipeline && (
          <div className="space-y-1 pb-3 pl-2">
            {designDoc.pipeline.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="font-mono font-medium">{step.from}</span>
                <ArrowRight className="w-3 h-3 text-[var(--accent-blue)]" />
                <span className="font-mono font-medium">{step.to}</span>
                <span className="text-[var(--text-muted)]">({step.messageType})</span>
              </div>
            ))}
          </div>
        )}

        {/* Synergies */}
        {designDoc.synergies?.length > 0 && (
          <>
            <SectionHeader id="synergies" icon={<Link2 className="w-3.5 h-3.5" />} title="시너지" count={designDoc.synergies.length} />
            {expandedSections.synergies && (
              <div className="space-y-1.5 pb-3 pl-2">
                {designDoc.synergies.map((s, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium">{s.existingDivision}</span>
                    <span className="text-[var(--text-muted)]"> — {s.description}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Applied Lessons */}
        {designDoc.appliedLessons?.length > 0 && (
          <>
            <SectionHeader id="lessons" icon={<Lightbulb className="w-3.5 h-3.5" />} title="적용된 교훈" count={designDoc.appliedLessons.length} />
            {expandedSections.lessons && (
              <div className="space-y-1.5 pb-3 pl-2">
                {designDoc.appliedLessons.map((l, i) => (
                  <div key={i} className="text-xs">
                    <p className="text-[var(--text-muted)] italic">&quot;{l.memory}&quot;</p>
                    <p className="text-[var(--text-secondary)] mt-0.5">→ {l.application}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Cost Estimate */}
        {designDoc.costEstimate && (
          <>
            <SectionHeader id="cost" icon={<DollarSign className="w-3.5 h-3.5" />} title="예상 비용" />
            {expandedSections.cost && (
              <div className="p-2.5 bg-[var(--bg-primary)] rounded-md mb-3">
                <div className="text-sm font-medium">
                  Monthly ${designDoc.costEstimate.monthly?.toFixed(2)}
                </div>
                {designDoc.costEstimate.breakdown && (
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-[var(--text-muted)]">
                    {Object.entries(designDoc.costEstimate.breakdown).map(([k, v]) => (
                      <span key={k}>{k}: ${Number(v).toFixed(2)}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-3 px-3 py-2 bg-[var(--accent-red)]/10 text-[var(--accent-red)] text-xs rounded">
          {error}
        </div>
      )}

      {/* Setup Wizard */}
      {setupMode && allRequirements.length > 0 && (
        <div className="px-4 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              외부 서비스 설정 ({filledCount}/{requiredCount})
            </h4>
            <button
              onClick={() => { setSetupMode(false); setError(null) }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              닫기
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            이 Division을 운영하려면 아래 서비스 연동이 필요합니다. API 키를 입력해주세요.
          </p>

          <div className="space-y-2.5">
            {allRequirements.map((req, i) => (
              <div key={i} className="p-3 bg-[var(--bg-primary)] rounded-md border border-[var(--border)]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${credentialValues[req.env]?.trim() ? 'bg-[var(--accent-green)]' : req.required !== false ? 'bg-[var(--accent-red)]' : 'bg-[var(--text-muted)]'}`} />
                    <span className="text-xs font-medium">{req.service}</span>
                    {req.required === false && <span className="text-[9px] text-[var(--text-muted)]">(선택)</span>}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">{req.agentName}</span>
                </div>
                {req.description && (
                  <p className="text-[10px] text-[var(--text-muted)] mb-1.5">{req.description}</p>
                )}
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={credentialValues[req.env] || ''}
                    onChange={e => setCredentialValues(prev => ({ ...prev, [req.env]: e.target.value }))}
                    placeholder={`${req.env} 입력`}
                    className="flex-1 px-2.5 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-xs font-mono focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
                  />
                  {req.setupUrl && (
                    <a
                      href={req.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 text-[10px] text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 rounded hover:bg-[var(--accent-blue)]/10 transition-colors shrink-0"
                    >
                      발급받기
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Build Button */}
          <button
            onClick={handleBuild}
            disabled={loading || !allRequiredFilled}
            className={`w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
              allRequiredFilled
                ? 'bg-[var(--accent-green)] text-white hover:opacity-90'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed'
            } disabled:opacity-30`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {loading ? '구축 중...' : allRequiredFilled ? '구축 시작' : `필수 항목 ${requiredCount - filledCount}개 남음`}
          </button>
        </div>
      )}

      {/* Feedback Input */}
      {feedbackMode && !setupMode && (
        <div className="px-4 pb-3">
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="수정 요청 사항을 입력하세요..."
            rows={3}
            className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm resize-none focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleFeedback}
              disabled={loading || !feedback.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent-blue)] text-white rounded-md hover:opacity-90 disabled:opacity-30 transition-opacity"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              피드백 전송
            </button>
            <button
              onClick={() => { setFeedbackMode(false); setFeedback(''); setError(null) }}
              className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!setupMode && (
        <div className="px-4 py-3 border-t border-[var(--border)] flex gap-2">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/30 rounded-md hover:bg-[var(--accent-green)]/20 disabled:opacity-30 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {allRequirements.length > 0 ? '승인 + 설정' : '승인 → 구축'}
          </button>
          <button
            onClick={() => { setFeedbackMode(!feedbackMode); setSetupMode(false); setError(null) }}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 rounded-md hover:bg-[var(--accent-blue)]/20 disabled:opacity-30 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            피드백
          </button>
        </div>
      )}
    </div>
  )
}
