'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCcw, Download, Loader2, Search, CheckCircle2, XCircle, Eye, ShieldCheck, ShieldAlert } from 'lucide-react'

interface SkillResult {
  name: string
  source: string
  query?: string
  description?: string
  trusted?: boolean
}

interface SearchResult {
  query: string
  skills: Array<{ name: string; description?: string }>
}

export function AgentActions({ agentId, agentName }: { agentId: string; agentName: string }) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [setting, setSetting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [hideSuspicious, setHideSuspicious] = useState(true)
  const [result, setResult] = useState<{
    type: 'sync' | 'setup' | 'preview'
    success: boolean
    message: string
    details?: string[]
    recommended?: SkillResult[]
    searchResults?: SearchResult[]
    filteredCount?: number
  } | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setResult(null)
    try {
      const res = await fetch('/api/agent/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({
        type: 'sync',
        success: true,
        message: `${data.discoveredSkills?.length || 0}개 스킬 발견, ${data.added || 0}개 추가됨`,
        details: data.results,
      })
      router.refresh()
    } catch (err) {
      setResult({ type: 'sync', success: false, message: String(err) })
    } finally {
      setSyncing(false)
    }
  }

  const handlePreview = async () => {
    setPreviewing(true)
    setResult(null)
    try {
      const res = await fetch('/api/agent/setup-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, dryRun: true, hideSuspicious }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({
        type: 'preview',
        success: true,
        message: `${data.queries?.length || 0}개 쿼리로 ${data.recommendedSkills?.length || 0}개 스킬 추천${data.filteredCount ? ` (${data.filteredCount}개 필터링됨)` : ''}`,
        details: data.results,
        recommended: data.recommendedSkills,
        searchResults: data.searchResults,
      })
    } catch (err) {
      setResult({ type: 'preview', success: false, message: String(err) })
    } finally {
      setPreviewing(false)
    }
  }

  const handleSetup = async () => {
    if (!confirm(`${agentName}에 추천 스킬을 설치하시겠습니까?`)) return
    setSetting(true)
    setResult(null)
    try {
      const res = await fetch('/api/agent/setup-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, hideSuspicious }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({
        type: 'setup',
        success: true,
        message: `${data.installed?.length || 0}개 설치 완료, ${data.failed?.length || 0}개 실패`,
        details: data.results,
        recommended: data.recommendedSkills,
      })
      router.refresh()
    } catch (err) {
      setResult({ type: 'setup', success: false, message: String(err) })
    } finally {
      setSetting(false)
    }
  }

  const isLoading = syncing || setting || previewing

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Hide Suspicious Toggle */}
        <button
          onClick={() => setHideSuspicious(!hideSuspicious)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium font-[family-name:var(--font-mono)] uppercase border rounded-md transition-colors ${
            hideSuspicious
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}
          title={hideSuspicious ? '의심스러운 스킬 숨김 (안전 모드)' : '모든 스킬 표시 (주의)'}
        >
          {hideSuspicious ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
          {hideSuspicious ? 'Safe Mode' : 'Show All'}
        </button>
        <span className="w-px h-4 bg-[var(--border)]" />
        <button
          onClick={handleSync}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium font-[family-name:var(--font-mono)] uppercase bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md hover:border-[var(--accent-blue)] disabled:opacity-30 transition-colors"
        >
          {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
          Sync Skills
        </button>
        <button
          onClick={handlePreview}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium font-[family-name:var(--font-mono)] uppercase bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md hover:border-[var(--accent-purple)] disabled:opacity-30 transition-colors"
        >
          {previewing ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
          Preview Skills
        </button>
        <button
          onClick={handleSetup}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium font-[family-name:var(--font-mono)] uppercase bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md hover:bg-emerald-100 disabled:opacity-30 transition-colors"
        >
          {setting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Install Skills
        </button>
      </div>

      {/* Result Panel */}
      {result && (
        <div className={`p-3 rounded-md border text-xs ${
          result.success
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-1.5 font-medium">
            {result.success
              ? <CheckCircle2 size={14} className="text-emerald-600" />
              : <XCircle size={14} className="text-red-600" />}
            <span className="uppercase font-[family-name:var(--font-mono)] text-[10px]">
              {result.type === 'sync' ? 'Sync' : result.type === 'preview' ? 'Preview' : 'Setup'}
            </span>
            <span className="text-[var(--text-secondary)]">{result.message}</span>
          </div>

          {/* Recommended Skills */}
          {result.recommended && result.recommended.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="font-medium text-[10px] uppercase font-[family-name:var(--font-mono)] text-[var(--text-muted)]">
                {result.type === 'preview' ? 'Recommended' : 'Installed'} Skills:
              </p>
              {result.recommended.map((s, i) => (
                <div key={i} className="flex items-center gap-2 pl-2">
                  <Search size={10} className="text-[var(--text-muted)]" />
                  <span className="font-[family-name:var(--font-mono)] font-medium">{s.name}</span>
                  <span className="text-[var(--text-muted)]">({s.source})</span>
                  {s.trusted && <span title="Whitelisted"><ShieldCheck size={10} className="text-emerald-500" /></span>}
                  {s.description && <span className="text-[var(--text-muted)] truncate">— {s.description}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Search Results (preview) */}
          {result.searchResults && result.searchResults.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[10px] font-[family-name:var(--font-mono)] text-[var(--text-muted)] uppercase">
                Search Details ({result.searchResults.length} queries)
              </summary>
              <div className="mt-1 space-y-1.5 pl-2">
                {result.searchResults.map((sr, i) => (
                  <div key={i}>
                    <span className="text-[var(--text-muted)]">&quot;{sr.query}&quot;:</span>
                    {sr.skills.slice(0, 3).map((s, j) => (
                      <span key={j} className="ml-1.5 px-1 py-0.5 bg-white rounded text-[9px]">{s.name}</span>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Log Details */}
          {result.details && result.details.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[10px] font-[family-name:var(--font-mono)] text-[var(--text-muted)] uppercase">
                Log ({result.details.length} entries)
              </summary>
              <pre className="mt-1 text-[9px] font-[family-name:var(--font-mono)] text-[var(--text-muted)] whitespace-pre-wrap">
                {result.details.join('\n')}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
