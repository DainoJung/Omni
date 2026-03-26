'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, XCircle, Play, AlertTriangle, ArrowRight, Settings, Circle, Clock, Activity,
  FileText, Image, Download, ExternalLink, ChevronDown, ChevronUp, Database, Zap, Tag,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// ═══════════════════════════════════════
// Realtime Activity Feed
// ═══════════════════════════════════════

interface AgentEvent {
  id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
  agents?: { name: string } | null
}

function formatEvent(e: AgentEvent): string {
  const p = e.payload ?? {}
  switch (e.event_type) {
    case 'build_progress': return `구축: ${String(p.stepName ?? '')} (${String(p.progress ?? '')}%)`
    case 'task_complete': return `${String(p.action ?? e.event_type)} 완료`
    case 'task_error': return `오류: ${String(p.detail ?? e.event_type)}`
    case 'task_start': return `${String(p.action ?? '작업')} 시작`
    case 'escalation': return `에스컬레이션: ${String(p.detail ?? '')}`
    default: return e.event_type
  }
}

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case 'task_start': return <Play className="w-4 h-4 text-[var(--accent-green)] shrink-0" />
    case 'task_complete': return <CheckCircle2 className="w-4 h-4 text-[var(--accent-green)] shrink-0" />
    case 'task_error': return <XCircle className="w-4 h-4 text-[var(--accent-red)] shrink-0" />
    case 'escalation': return <AlertTriangle className="w-4 h-4 text-[var(--accent-yellow)] shrink-0" />
    case 'message_sent': return <ArrowRight className="w-4 h-4 text-[var(--accent-blue)] shrink-0" />
    case 'build_progress': return <Settings className="w-4 h-4 text-[var(--text-muted)] shrink-0 animate-spin" />
    default: return <Circle className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
  }
}

export function RealtimeActivity({ divisionId, initialEvents }: { divisionId: string; initialEvents: AgentEvent[] }) {
  const [events, setEvents] = useState<AgentEvent[]>(initialEvents)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`division-events-${divisionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_events',
        filter: `division_id=eq.${divisionId}`,
      }, (payload) => {
        setEvents(prev => [payload.new as AgentEvent, ...prev].slice(0, 30))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [divisionId])

  return (
    <section>
      <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Recent Activity
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
      </h3>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] max-h-[400px] overflow-y-auto">
        {events.length > 0 ? (
          events.map((e) => (
            <div key={e.id} className="px-4 py-3 flex items-center gap-3 text-sm">
              <EventIcon type={e.event_type} />
              <span className="flex-1 truncate">{formatEvent(e)}</span>
              <span className="flex items-center gap-1 text-[var(--text-muted)] text-xs shrink-0">
                <Clock className="w-3 h-3" />
                {new Date(e.created_at).toLocaleTimeString('ko-KR')}
              </span>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-[var(--text-secondary)]">
            아직 활동 기록이 없습니다
          </div>
        )}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════
// Realtime Pipeline Outputs (Smart Renderer)
// ═══════════════════════════════════════

interface PipelineOutput {
  id: string
  pipeline_run_id: string
  step_name: string
  step_order: number
  output_type: string
  output_format: string | null
  output_data: Record<string, unknown>
  file_url: string | null
  status: string
  created_at: string
  agents?: { name: string } | null
}

function OutputTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'research_result': return <Database className="w-4 h-4 text-[var(--accent-blue)]" />
    case 'write_result': return <FileText className="w-4 h-4 text-[var(--accent-green)]" />
    case 'publish_result': return <ExternalLink className="w-4 h-4 text-[var(--accent-purple)]" />
    case 'file': return <Image className="w-4 h-4 text-[var(--accent-yellow)]" />
    default: return <Zap className="w-4 h-4 text-[var(--text-muted)]" />
  }
}

function OutputTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    research_result: '리서치 결과',
    write_result: '콘텐츠',
    publish_result: '발행 결과',
    file: '파일',
  }
  return <span className="text-xs text-[var(--text-muted)]">{labels[type] || type}</span>
}

// ── Smart Renderers ──

function ResearchRenderer({ data }: { data: Record<string, unknown> }) {
  const payload = (data.payload || data) as Record<string, unknown>
  const topics = (payload.topics || payload.products || []) as Array<Record<string, unknown>>

  if (topics.length === 0) return <JsonFallback data={data} />

  return (
    <div className="space-y-2">
      {topics.map((topic, i) => (
        <div key={i} className="p-3 bg-[var(--bg-primary)] rounded-md">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium">{String(topic.keyword || topic.idea || topic.title || `항목 ${i + 1}`)}</h4>
            {Boolean(topic.searchVolume) && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                topic.searchVolume === 'high' ? 'bg-emerald-100 text-emerald-700' :
                topic.searchVolume === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>{String(topic.searchVolume)}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-[var(--text-muted)]">
            {Boolean(topic.category) && <span className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded">{String(topic.category)}</span>}
            {Boolean(topic.competition) && <span>경쟁: {String(topic.competition)}</span>}
            {Boolean(topic.estimatedPrice) && <span>가격: {String(topic.estimatedPrice)}</span>}
            {Boolean(topic.targetMarket) && <span>타겟: {Array.isArray(topic.targetMarket) ? topic.targetMarket.join(', ') : String(topic.targetMarket)}</span>}
          </div>
          {Boolean(topic.differentiator) && <p className="text-xs text-[var(--accent-blue)] mt-1.5">{String(topic.differentiator)}</p>}
          {Boolean(topic.affiliateOpportunity) && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(topic.affiliateOpportunity as string[]).map((a, j) => (
                <span key={j} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] rounded">
                  <Tag className="w-2.5 h-2.5" />{a}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ContentRenderer({ data }: { data: Record<string, unknown> }) {
  const payload = (data.payload || data) as Record<string, unknown>

  const title = payload.productName || payload.title || payload.headline
  const descKo = payload.description_ko || payload.description || payload.script || payload.content
  const descEn = payload.description_en
  const points = payload.sellingPoints as string[] | undefined
  const faq = payload.faq as Array<{ q: string; a: string }> | undefined
  const tags = payload.tags as string[] | undefined
  const thumbnailPrompt = payload.thumbnailPrompt || payload.thumbnail_text

  if (!title && !descKo) return <JsonFallback data={data} />

  return (
    <div className="space-y-3">
      {Boolean(title) && <h4 className="text-base font-bold">{String(title)}</h4>}

      {points && points.length > 0 && (
        <div>
          <p className="text-[10px] uppercase text-[var(--text-muted)] font-medium mb-1">Selling Points</p>
          <ul className="list-disc pl-4 text-sm space-y-0.5">
            {points.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}

      {Boolean(descKo) && (
        <div>
          <p className="text-[10px] uppercase text-[var(--text-muted)] font-medium mb-1">
            {Boolean(descEn) ? '한국어' : '내용'}
          </p>
          <div className="text-sm text-[var(--text-secondary)] prose-sm max-h-48 overflow-y-auto">
            <ReactMarkdown>{String(descKo)}</ReactMarkdown>
          </div>
        </div>
      )}

      {Boolean(descEn) && (
        <div>
          <p className="text-[10px] uppercase text-[var(--text-muted)] font-medium mb-1">English</p>
          <div className="text-sm text-[var(--text-secondary)] prose-sm max-h-48 overflow-y-auto">
            <ReactMarkdown>{String(descEn)}</ReactMarkdown>
          </div>
        </div>
      )}

      {faq && faq.length > 0 && (
        <div>
          <p className="text-[10px] uppercase text-[var(--text-muted)] font-medium mb-1">FAQ</p>
          <div className="space-y-1.5">
            {faq.map((f, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium">Q. {f.q}</p>
                <p className="text-[var(--text-secondary)]">A. {f.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded">{t}</span>
          ))}
        </div>
      )}

      {Boolean(thumbnailPrompt) && (
        <div className="p-2 bg-[var(--accent-yellow)]/10 rounded text-xs">
          <span className="font-medium">썸네일 프롬프트: </span>
          <span className="text-[var(--text-secondary)]">{String(thumbnailPrompt)}</span>
        </div>
      )}
    </div>
  )
}

function PublishRenderer({ data, fileUrl }: { data: Record<string, unknown>; fileUrl?: string | null }) {
  const payload = (data.payload || data) as Record<string, unknown>

  const status = payload.status || payload.publishStatus
  const productTitle = payload.productTitle || payload.listingTitle
  const platform = payload.platform
  const recommendedPrice = payload.recommendedPrice
  const shortDescription = payload.shortDescription || payload.description
  const nextAction = payload.nextAction
  const checklist = payload.launchChecklist as string[] | undefined
  const url = payload.url || payload.productUrl || payload.gumroadUrl || payload.link
  const fileName = (data.fileName || payload.fileName) as string | undefined
  const affiliateLinks = payload.affiliateLinks as Array<{ product: string; url: string }> | undefined
  const publishReady = payload.publishReady

  return (
    <div className="space-y-3">
      {/* Status + Platform + Price */}
      <div className="flex items-center gap-2 flex-wrap">
        {Boolean(status) && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            status === 'success' || status === 'published' || publishReady ? 'bg-emerald-100 text-emerald-700' :
            status === 'failed' ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700'
          }`}>{String(status)}</span>
        )}
        {Boolean(platform) && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">{String(platform)}</span>
        )}
        {Boolean(recommendedPrice) && (
          <span className="text-xs font-medium">{String(recommendedPrice)}</span>
        )}
      </div>

      {/* Product Title */}
      {Boolean(productTitle) && <h4 className="text-sm font-bold">{String(productTitle)}</h4>}

      {/* Short Description */}
      {Boolean(shortDescription) && <p className="text-sm text-[var(--text-secondary)]">{String(shortDescription)}</p>}

      {/* Next Action */}
      {Boolean(nextAction) && (
        <div className="p-2.5 bg-[var(--accent-blue)]/5 border border-[var(--accent-blue)]/20 rounded-md">
          <p className="text-[10px] uppercase text-[var(--accent-blue)] font-medium mb-1">Next Action</p>
          <p className="text-xs text-[var(--text-secondary)]">{String(nextAction)}</p>
        </div>
      )}

      {/* Launch Checklist */}
      {checklist && checklist.length > 0 && (
        <div>
          <p className="text-[10px] uppercase text-[var(--text-muted)] font-medium mb-1">Launch Checklist</p>
          <div className="space-y-1">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="w-4 h-4 rounded border border-[var(--border)] flex items-center justify-center text-[9px] text-[var(--text-muted)]">{i + 1}</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* URL */}
      {Boolean(url) && (
        <a href={String(url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[var(--accent-blue)] hover:underline">
          <ExternalLink className="w-3.5 h-3.5" />{String(url)}
        </a>
      )}

      {/* File */}
      {fileUrl && (
        <a href={fileUrl} download={fileName} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] rounded-md hover:bg-[var(--accent-blue)]/20">
          <Download className="w-3.5 h-3.5" />{fileName || '파일 다운로드'}
        </a>
      )}

      {/* Affiliate Links */}
      {affiliateLinks && affiliateLinks.length > 0 && (
        <div>
          <p className="text-[10px] uppercase text-[var(--text-muted)] font-medium mb-1">제휴 링크</p>
          <div className="space-y-1">
            {affiliateLinks.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="font-medium">{l.product}</span>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-blue)] truncate">{l.url}</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FileRenderer({ data, fileUrl }: { data: Record<string, unknown>; fileUrl?: string | null }) {
  const fileName = String(data.fileName || 'file')
  const fileSize = data.fileSize ? `${(Number(data.fileSize) / 1024).toFixed(1)}KB` : null
  const mimeType = String(data.mimeType || '')
  const isImage = mimeType.startsWith('image/')

  return (
    <div className="space-y-2">
      {isImage && fileUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileUrl} alt={fileName} className="max-h-64 rounded-md border border-[var(--border)]" />
      )}
      <div className="flex items-center gap-3">
        <Image className="w-8 h-8 text-[var(--text-muted)]" />
        <div>
          <p className="text-sm font-medium">{fileName}</p>
          <p className="text-xs text-[var(--text-muted)]">{[mimeType, fileSize].filter(Boolean).join(' · ')}</p>
        </div>
        {fileUrl && (
          <a href={fileUrl} download={fileName} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] rounded-md hover:bg-[var(--accent-blue)]/20">
            <Download className="w-3.5 h-3.5" />다운로드
          </a>
        )}
      </div>
      {Boolean(data.description) && <p className="text-xs text-[var(--text-secondary)]">{String(data.description)}</p>}
    </div>
  )
}

function JsonFallback({ data }: { data: Record<string, unknown> }) {
  return (
    <pre className="text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap overflow-auto max-h-48">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function SmartOutputRenderer({ output }: { output: PipelineOutput }) {
  const { output_type, output_data, file_url } = output

  // file_url이 있으면 파일 렌더러
  if (file_url && output_data.fileName) {
    return <FileRenderer data={output_data} fileUrl={file_url} />
  }

  switch (output_type) {
    case 'research_result':
      return <ResearchRenderer data={output_data} />
    case 'write_result':
      return <ContentRenderer data={output_data} />
    case 'publish_result':
      return <PublishRenderer data={output_data} fileUrl={file_url} />
    default:
      // payload 안에 구조가 있으면 자동 감지
      const payload = (output_data.payload || output_data) as Record<string, unknown>
      if (payload.topics || payload.products) return <ResearchRenderer data={output_data} />
      if (payload.productName || payload.title || payload.description_ko || payload.script) return <ContentRenderer data={output_data} />
      if (payload.url || payload.publishStatus || payload.affiliateLinks || payload.launchChecklist || payload.publishReady || payload.platform) return <PublishRenderer data={output_data} fileUrl={file_url} />
      return <JsonFallback data={output_data} />
  }
}

// ── Output Card ──

function OutputCard({ output }: { output: PipelineOutput }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] flex items-center justify-center text-xs font-medium">{output.step_order}</span>
          <OutputTypeIcon type={output.output_type} />
          <span className="font-medium">{output.step_name}</span>
          <OutputTypeLabel type={output.output_type} />
          {output.file_url && <Download className="w-3 h-3 text-[var(--accent-blue)]" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(output.created_at).toLocaleString('ko-KR')}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <SmartOutputRenderer output={output} />
        </div>
      )}
    </div>
  )
}

// ── Main Component ──

export function RealtimeOutputs({ divisionId, initialOutputs }: { divisionId: string; initialOutputs: PipelineOutput[] }) {
  const [outputs, setOutputs] = useState<PipelineOutput[]>(initialOutputs)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`division-outputs-${divisionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'pipeline_outputs',
        filter: `division_id=eq.${divisionId}`,
      }, (payload) => {
        setOutputs(prev => [payload.new as PipelineOutput, ...prev].slice(0, 20))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [divisionId])

  if (outputs.length === 0) return null

  // pipeline_run_id로 그룹핑
  const runs = new Map<string, PipelineOutput[]>()
  for (const o of outputs) {
    const key = o.pipeline_run_id || 'unknown'
    if (!runs.has(key)) runs.set(key, [])
    runs.get(key)!.push(o)
  }

  return (
    <section>
      <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Pipeline Outputs
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
      </h3>
      <div className="space-y-4">
        {[...runs.entries()].map(([runId, runOutputs]) => (
          <div key={runId}>
            <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase mb-1.5">{runId}</p>
            <div className="space-y-2">
              {runOutputs.sort((a, b) => a.step_order - b.step_order).map(o => (
                <OutputCard key={o.id} output={o} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
