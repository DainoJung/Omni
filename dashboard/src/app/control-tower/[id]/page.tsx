'use client'

import { useState, useRef, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, ChevronDown, ChevronUp, Sparkles, Check,
  ArrowUp, Bot, X, Terminal, Layers, Brain,
  Activity, Zap, MessageSquare, FolderOpen, Clock,
  BarChart3, Shield, Settings, Globe, Cpu, ChevronRight,
  Loader2, Eye, FileText, Command,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@/lib/supabase/client'

// ── Types ──
type ActionType = 'tool' | 'thought' | 'file' | 'api' | 'search' | 'db'

interface SubAction {
  id: string
  type: ActionType
  title?: string
  content?: string
  log?: string
}

interface Step {
  id: string
  status: 'running' | 'done'
  name: string
  subActions: SubAction[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CommandData = { command: string; data: any }

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  steps: Step[]
  actions: InlineAction[]
  isDone: boolean
  timestamp: number
  commandData?: CommandData
}

interface InlineAction {
  id: string
  type: string
  label: string
  data: string
}

interface ChatSession {
  id: string
  title: string
  timestamp: number
  preview: string
}

// ── Constants ──
const SESSIONS_INDEX_KEY = 'omni-ct-sessions'
function msgKey(id: string) { return `omni-ct-${id}-messages` }

// ── Parsers ──
const ACTION_REGEX = /\[ACTION:([^:\]]+):([^:\]]+)(?::([^\]]+))?\]/g

function extractActions(text: string): { cleanText: string; actions: InlineAction[] } {
  const actions: InlineAction[] = []
  let counter = 0
  const cleanText = text.replace(ACTION_REGEX, (_, type, label, data) => {
    actions.push({ id: `action-${counter++}`, type, label, data: data || '' })
    return ''
  })
  return { cleanText: cleanText.trim(), actions }
}

function parseAssistantContent(text: string): { steps: Step[]; body: string; isDone: boolean } {
  const lines = text.split('\n')
  const steps: Step[] = []
  const bodyLines: string[] = []
  let isDone = false
  let currentStep: Step | null = null
  let currentAction: SubAction | null = null
  let counter = 0

  for (const line of lines) {
    if (line.includes('[DONE]')) { isDone = true; continue }

    const planMatch = line.match(/\[PLAN:(.+?)\]/)
    if (planMatch) {
      if (currentStep) {
        if (currentAction) currentStep.subActions.push(currentAction)
        steps.push(currentStep)
      }
      currentStep = { id: `step-${counter++}`, status: 'done', name: planMatch[1].trim(), subActions: [] }
      currentAction = null
      continue
    }

    // Match action markers: [TOOL:], [FILE:], [API:], [SEARCH:], [DB:]
    const actionMatch = line.match(/\[(TOOL|FILE|API|SEARCH|DB):(.+?)\]/)
    if (actionMatch) {
      if (!currentStep) currentStep = { id: `step-${counter++}`, status: 'running', name: 'Processing', subActions: [] }
      if (currentAction) currentStep.subActions.push(currentAction)
      const typeMap: Record<string, ActionType> = { TOOL: 'tool', FILE: 'file', API: 'api', SEARCH: 'search', DB: 'db' }
      currentAction = { id: `act-${counter++}`, type: typeMap[actionMatch[1]] || 'tool', title: actionMatch[2].trim(), log: '' }
      continue
    }

    if (currentAction && currentAction.type !== 'thought' && line.trim().startsWith('>')) {
      currentAction.log += line.replace('>', '').trim() + '\n'
      continue
    }

    if (currentStep) {
      if (line.trim() !== '') {
        if (currentAction && currentAction.type === 'tool') {
          currentStep.subActions.push(currentAction)
          currentAction = null
        }
        if (!currentAction) {
          currentAction = { id: `act-${counter++}`, type: 'thought', content: line }
        } else if (currentAction.type === 'thought') {
          currentAction.content += '\n' + line
        }
      }
    } else {
      bodyLines.push(line)
    }
  }

  if (currentStep) {
    if (currentAction) currentStep.subActions.push(currentAction)
    steps.push(currentStep)
  }

  if (steps.length === 0 && text.includes('[STEP:')) {
    const legacyLines = text.split('\n')
    for (const l of legacyLines) {
      const m = l.match(/\[STEP:(.+?):(.+?):(.+?)(?::(.+?))?\]/)
      if (m) {
        steps.push({
          id: `ls-${counter++}`,
          status: m[2] === '완료' ? 'done' : 'running',
          name: m[3],
          subActions: m[4] ? [{ id: 'a', type: 'thought', content: m[4] }] : []
        })
      } else {
        bodyLines.push(l)
      }
    }
    return { steps, body: bodyLines.join('\n').replace(/\[STEP:.*?\]/g, '').trim(), isDone }
  }

  return { steps, body: bodyLines.join('\n').trim(), isDone }
}

function parseSSEEvents(chunk: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = []
  const lines = chunk.split('\n')
  let currentEvent = ''
  for (const line of lines) {
    if (line.startsWith('event: ')) currentEvent = line.slice(7).trim()
    else if (line.startsWith('data: ')) {
      const data = line.slice(6).trim()
      if (data === '[DONE]') events.push({ event: 'done', data: '' })
      else if (data) events.push({ event: currentEvent || 'message', data })
      currentEvent = ''
    }
  }
  return events
}

// ── Mock ──
const getMockResponse = () => `
[PLAN:시스템 현황 조회 — Division, Agent, Infrastructure 상태 수집]
[DB:divisions 테이블 조회]
> SELECT id, name, status, slug FROM divisions ORDER BY created_at DESC;
> 4 rows returned
> ┌─────────────────────┬────────────┬───────────┐
> │ name                │ status     │ slug      │
> ├─────────────────────┼────────────┼───────────┤
> │ 유튜브 요리 채널     │ operating  │ youtube   │
> │ 블로그 콘텐츠        │ operating  │ blog-b    │
> │ 디지털 상품          │ building   │ digital-d │
> │ 구매대행             │ designing  │ proxy     │
> └─────────────────────┴────────────┴───────────┘
[DB:agents 테이블 조회]
> SELECT name, role, status, last_active_at FROM agents;
> 7 agents found — 4 active, 2 idle, 1 error
현재 4개 Division이 등록되어 있으며, 2개가 운영 중입니다. 에이전트 7개 중 1개에서 오류가 감지되었습니다.
[API:OpenClaw Gateway 헬스체크]
> GET http://127.0.0.1:18789/health
> Status: 200 OK
> Response: { "status": "healthy", "uptime": "3d 14h", "agents_loaded": 7 }
[TOOL:Supabase 연결 상태 확인]
> Connection: active
> Latency: 12ms
> Realtime channels: 4 subscribed

[PLAN:에이전트 활동 분석 — 최근 이벤트 및 성과 지표 수집]
[DB:최근 24시간 에이전트 이벤트 조회]
> SELECT event_type, COUNT(*) FROM agent_events
> WHERE created_at > NOW() - INTERVAL '24h' GROUP BY event_type;
> task_complete: 23, task_start: 25, escalation: 2, task_error: 1
[SEARCH:에러 발생 에이전트 로그 검색]
> Searching agent_events WHERE event_type = 'task_error'...
> Found: Agent "content-writer" (blog-b) — Rate limit exceeded on OpenAI API
> Timestamp: 2026-03-27T02:14:33Z
> Auto-retry scheduled in 15 minutes
에이전트 "content-writer"에서 OpenAI API rate limit 오류가 발생했으나, 자동 재시도가 예약되어 있습니다.
[API:LLM 사용량 집계]
> GET /api/llm-usage?period=24h
> Total tokens: 1,247,830 (input: 892,100 / output: 355,730)
> Total cost: $2.34
> Top model: gpt-5-mini (87%)

[PLAN:Critical Decision 확인 — 대기 중인 승인 요청 조회]
[DB:pending critical_decisions 조회]
> SELECT title, priority, division_id FROM critical_decisions WHERE status = 'pending';
> 1 row returned
> ┌──────────────────────────────────┬──────────┐
> │ title                            │ priority │
> ├──────────────────────────────────┼──────────┤
> │ 디지털 상품 외주 디자이너 계약     │ high     │
> └──────────────────────────────────┴──────────┘
승인 대기 중인 Critical Decision 1건이 있습니다. "디지털 상품 외주 디자이너 계약" — 우선순위: high.

[PLAN:성과 리포트 생성 — 메트릭 집계 및 문서 작성]
[DB:division_metrics 주간 집계]
> SELECT division_id, metric_name, SUM(metric_value) FROM division_metrics
> WHERE period_start > '2026-03-20' GROUP BY division_id, metric_name;
> blog-b: page_views 12,430 / revenue ₩234,000
> youtube: views 8,920 / subscribers +127
[FILE:weekly-report-2026-03-27.md 생성]
> # Omni Weekly Report — 2026-03-27
> ## Division Performance
> | Division | Key Metric | Value | Trend |
> |----------|-----------|-------|-------|
> | 블로그 콘텐츠 | Page Views | 12,430 | ↑ 18% |
> | 유튜브 요리 | Video Views | 8,920 | ↑ 7% |
> ## Cost Summary
> - Total LLM Cost: $14.20 (weekly)
> - Infrastructure: $8.50
> ## Action Items
> - [ ] content-writer rate limit 모니터링
> - [ ] 디지털 상품 외주 계약 승인 필요
> File saved to: /reports/weekly-report-2026-03-27.md
주간 리포트가 생성되어 저장되었습니다.

[PLAN:종합 분석 및 추천 사항 정리]
전체 시스템 분석을 완료했습니다. 주요 발견 사항과 추천 사항을 정리합니다.
[DONE]

## 시스템 현황 요약

**운영 상태**: 정상 (4/4 Division 활성)

| 항목 | 상태 | 비고 |
|------|------|------|
| Gateway | ✅ Healthy | Uptime 3일 14시간 |
| Supabase | ✅ Connected | Latency 12ms |
| Agents | ⚠️ 6/7 정상 | content-writer rate limit |
| Decisions | 🔴 1건 대기 | 외주 계약 승인 필요 |

**추천 조치**:
1. Critical Decision "외주 디자이너 계약" 검토 및 승인
2. content-writer 에이전트 rate limit 해소 확인
3. 블로그 Division 성과 호조 — 콘텐츠 확대 고려
`

// ── Suggestion Chips ──
const SUGGESTIONS = [
  { icon: Layers, label: '새 Division 만들기', prompt: '새로운 Division을 만들고 싶어. 유튜브 요리 채널 운영 사업을 시작하려고 해.' },
  { icon: Activity, label: 'Division 상태 확인', prompt: '현재 운영 중인 모든 Division의 상태를 보여줘.' },
  { icon: Brain, label: '전략 분석', prompt: 'Division 간 시너지 분석과 새 사업 기회를 제안해줘.' },
  { icon: Shield, label: 'Critical Decision 확인', prompt: '대기 중인 Critical Decision 목록을 보여줘.' },
  { icon: BarChart3, label: '성과 리포트', prompt: '이번 주 전체 Division 성과 리포트를 작성해줘.' },
  { icon: Zap, label: '에이전트 테스트', prompt: '인사이트 데이터를 수집하고 분석 플랜을 실행해줘.' },
]

// ── Slash Command Palette ──
interface SlashCmd {
  name: string
  description: string
  category: 'Data' | 'Operations' | 'Strategy'
  icon: typeof Layers
}

const COMMAND_PALETTE: SlashCmd[] = [
  { name: 'divisions',  description: 'View all divisions and status',       category: 'Data',       icon: Layers },
  { name: 'agents',     description: 'View all agents and activity',        category: 'Data',       icon: Bot },
  { name: 'decisions',  description: 'Pending critical decisions',          category: 'Data',       icon: Shield },
  { name: 'memory',     description: 'Browse institutional memory',         category: 'Data',       icon: Brain },
  { name: 'status',     description: 'System health overview',              category: 'Operations', icon: Activity },
  { name: 'metrics',    description: 'Performance metrics & KPIs',          category: 'Operations', icon: BarChart3 },
  { name: 'events',     description: 'Recent agent event log',              category: 'Operations', icon: Clock },
  { name: 'build',      description: 'Build a new division',                category: 'Strategy',   icon: Zap },
  { name: 'strategy',   description: 'Cross-division analysis',             category: 'Strategy',   icon: Globe },
  { name: 'propose',    description: 'Propose a new business idea',         category: 'Strategy',   icon: Sparkles },
]

function CommandPalette({
  filter,
  onSelect,
  selectedIndex,
}: {
  filter: string
  onSelect: (cmd: string) => void
  selectedIndex: number
}) {
  const query = filter.slice(1).toLowerCase()
  const filtered = COMMAND_PALETTE.filter(c => c.name.includes(query) || c.description.toLowerCase().includes(query))

  if (filtered.length === 0) return null

  const categories = ['Data', 'Operations', 'Strategy'] as const
  let globalIdx = 0

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] overflow-hidden z-30 max-h-[340px] overflow-y-auto animate-in slide-in-from-bottom-2 fade-in duration-150">
      {categories.map(cat => {
        const items = filtered.filter(c => c.category === cat)
        if (items.length === 0) return null
        return (
          <div key={cat}>
            <div className="px-3 pt-2.5 pb-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              {cat}
            </div>
            {items.map(cmd => {
              const thisIdx = globalIdx++
              const isSelected = thisIdx === selectedIndex
              return (
                <button
                  key={cmd.name}
                  onClick={() => onSelect('/' + cmd.name)}
                  className={`flex items-center gap-3 w-full px-3 py-2 text-left transition-colors ${
                    isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <cmd.icon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  <div className="min-w-0">
                    <div className={`text-[13px] font-medium ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {cmd.name}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate">{cmd.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Slash Command Executor ──
const SLASH_COMMANDS: Record<string, (supabase: ReturnType<typeof createClient>) => Promise<CommandData>> = {
  '/divisions': async (sb) => {
    const { data } = await sb
      .from('divisions')
      .select('id, name, slug, status, description, created_at')
      .order('created_at', { ascending: false })
    return { command: 'divisions', data: data || [] }
  },
  '/agents': async (sb) => {
    const { data } = await sb
      .from('agents')
      .select('id, division_id, name, role, model, status, last_active_at, error_count, divisions(name)')
      .order('last_active_at', { ascending: false })
    return { command: 'agents', data: data || [] }
  },
  '/decisions': async (sb) => {
    const { data } = await sb
      .from('critical_decisions')
      .select('id, division_id, agent_id, priority, title, description, options, recommendation, status, expires_at, created_at, divisions(name)')
      .order('created_at', { ascending: false })
      .limit(20)
    return { command: 'decisions', data: data || [] }
  },
  '/memory': async (sb) => {
    const { data } = await sb
      .from('memories')
      .select('id, division_id, category, content, tags, confidence, created_at, times_referenced, divisions(name)')
      .order('created_at', { ascending: false })
      .limit(20)
    return { command: 'memory', data: data || [] }
  },
}

// ── Status Helpers ──
const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  operating: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Operating' },
  building:  { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Building' },
  designing: { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500',  label: 'Designing' },
  proposed:  { bg: 'bg-gray-50',    text: 'text-gray-600',    dot: 'bg-gray-400',    label: 'Proposed' },
  paused:    { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Paused' },
  sunset:    { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Sunset' },
  active:    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Active' },
  idle:      { bg: 'bg-gray-50',    text: 'text-gray-600',    dot: 'bg-gray-400',    label: 'Idle' },
  error:     { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Error' },
  pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Pending' },
  approved:  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' },
  rejected:  { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Rejected' },
  expired:   { bg: 'bg-gray-50',    text: 'text-gray-500',    dot: 'bg-gray-400',    label: 'Expired' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.idle
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'border-l-red-500 bg-red-50/30',
  medium: 'border-l-amber-500 bg-amber-50/30',
  low: 'border-l-blue-500 bg-blue-50/30',
}

const CATEGORY_ICONS: Record<string, string> = {
  operations: '⚙️',
  insights: '💡',
  lessons: '📚',
}

// ── Command Renderers ──

function DivisionsView({ data, onAction }: { data: any[]; onAction: (prompt: string) => void }) {
  if (data.length === 0) return <div className="text-[13px] text-[var(--text-muted)] py-4">No divisions found.</div>

  const grouped = {
    active: data.filter(d => ['operating', 'building'].includes(d.status)),
    other: data.filter(d => !['operating', 'building'].includes(d.status)),
  }

  return (
    <div className="space-y-3 w-full max-w-[720px]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          {data.length} Divisions
        </span>
        <button
          onClick={() => onAction('새로운 Division을 만들고 싶어.')}
          className="text-[12px] font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> New
        </button>
      </div>

      {grouped.active.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {grouped.active.map((d: any) => (
            <button
              key={d.id}
              onClick={() => onAction(`Division "${d.name}"의 상세 현황을 보여줘.`)}
              className="text-left p-3 border border-[var(--border-main)] rounded-xl hover:border-gray-300 hover:shadow-sm transition-all bg-white group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[14px] font-semibold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors truncate">
                  {d.name}
                </span>
                <StatusBadge status={d.status} />
              </div>
              {d.description && (
                <p className="text-[12px] text-[var(--text-muted)] line-clamp-2">{d.description}</p>
              )}
              <div className="text-[11px] text-[var(--text-muted)] mt-2 font-mono">
                {d.slug}
              </div>
            </button>
          ))}
        </div>
      )}

      {grouped.other.length > 0 && (
        <div className="space-y-1">
          {grouped.other.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[13px] text-[var(--text-secondary)] truncate">{d.name}</span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono shrink-0">{d.slug}</span>
              </div>
              <StatusBadge status={d.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AgentsView({ data, onAction }: { data: any[]; onAction: (prompt: string) => void }) {
  if (data.length === 0) return <div className="text-[13px] text-[var(--text-muted)] py-4">No agents found.</div>

  const byStatus = { active: 0, idle: 0, error: 0 }
  data.forEach((a: any) => {
    if (a.status === 'active') byStatus.active++
    else if (a.status === 'error') byStatus.error++
    else byStatus.idle++
  })

  return (
    <div className="space-y-3 w-full max-w-[720px]">
      {/* Status summary */}
      <div className="flex items-center gap-4">
        <span className="text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          {data.length} Agents
        </span>
        <div className="flex items-center gap-3 text-[12px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{byStatus.active} active</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" />{byStatus.idle} idle</span>
          {byStatus.error > 0 && <span className="flex items-center gap-1 text-red-600"><span className="w-2 h-2 rounded-full bg-red-500" />{byStatus.error} error</span>}
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {data.map((a: any) => (
          <button
            key={a.id}
            onClick={() => onAction(`Agent "${a.name}"의 최근 활동과 상태를 보여줘.`)}
            className="text-left p-3 border border-[var(--border-main)] rounded-xl hover:border-gray-300 hover:shadow-sm transition-all bg-white group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <Bot className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <span className="text-[13px] font-semibold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors truncate">
                  {a.name}
                </span>
              </div>
              <StatusBadge status={a.status || 'idle'} />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mt-1.5">
              <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{a.role}</span>
              <span>{a.model}</span>
              {(a as any).divisions?.name && <span className="truncate">· {(a as any).divisions.name}</span>}
            </div>
            {a.error_count > 0 && (
              <div className="text-[11px] text-red-500 mt-1">⚠ {a.error_count} errors</div>
            )}
            {a.last_active_at && (
              <div className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                Last: {new Date(a.last_active_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function DecisionsView({ data, onAction }: { data: any[]; onAction: (prompt: string) => void }) {
  if (data.length === 0) return <div className="text-[13px] text-[var(--text-muted)] py-4">No decisions found.</div>

  const pending = data.filter((d: any) => d.status === 'pending')
  const resolved = data.filter((d: any) => d.status !== 'pending')

  const handleDecision = async (id: string, option: string, title: string) => {
    try {
      const supabase = createClient()
      await supabase
        .from('critical_decisions')
        .update({ status: option === '__reject__' ? 'rejected' : 'approved', decided_option: option })
        .eq('id', id)
      onAction(`Decision "${title}"을(를) ${option === '__reject__' ? '거절' : '승인'}했어. 현재 decisions 상태를 다시 보여줘.`)
    } catch {}
  }

  return (
    <div className="space-y-3 w-full max-w-[720px]">
      {pending.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-amber-700 uppercase tracking-wider">
              ⏳ {pending.length} Pending
            </span>
          </div>
          <div className="space-y-2">
            {pending.map((d: any) => (
              <div key={d.id} className={`p-3 border border-[var(--border-main)] border-l-4 rounded-xl ${PRIORITY_STYLES[d.priority] || ''}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--text-primary)]">{d.title}</div>
                    {(d as any).divisions?.name && (
                      <span className="text-[11px] text-[var(--text-muted)]">{(d as any).divisions.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      d.priority === 'high' ? 'bg-red-100 text-red-700' : d.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>{d.priority}</span>
                  </div>
                </div>
                <p className="text-[12px] text-[var(--text-secondary)] mb-2 line-clamp-2">{d.description}</p>
                {d.recommendation && (
                  <div className="text-[11px] text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 mb-2">
                    💡 Recommendation: {typeof d.recommendation === 'string' ? d.recommendation : JSON.stringify(d.recommendation)}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {d.options && d.options.length > 0 ? (
                    d.options.map((opt: any, i: number) => {
                      const optLabel = typeof opt === 'string' ? opt : opt?.label || `Option ${i + 1}`
                      return (
                        <button
                          key={i}
                          onClick={() => handleDecision(d.id, optLabel, d.title)}
                          className="px-3 py-1.5 text-[12px] font-medium bg-white border border-[var(--border-main)] rounded-lg hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
                        >
                          ✓ {optLabel}
                        </button>
                      )
                    })
                  ) : (
                    <>
                      <button
                        onClick={() => handleDecision(d.id, 'approved', d.title)}
                        className="px-3 py-1.5 text-[12px] font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleDecision(d.id, '__reject__', d.title)}
                        className="px-3 py-1.5 text-[12px] font-medium bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        ✕ Reject
                      </button>
                    </>
                  )}
                </div>
                {d.expires_at && (
                  <div className="text-[10px] text-[var(--text-muted)] mt-2 font-mono">
                    Expires: {new Date(d.expires_at).toLocaleString('ko-KR')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {resolved.length > 0 && (
        <>
          <div className="text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mt-2">
            Resolved ({resolved.length})
          </div>
          <div className="space-y-1">
            {resolved.slice(0, 5).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <span className="text-[13px] text-[var(--text-secondary)] truncate block">{d.title}</span>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MemoryView({ data, onAction }: { data: any[]; onAction: (prompt: string) => void }) {
  const [filter, setFilter] = useState<string | null>(null)
  if (data.length === 0) return <div className="text-[13px] text-[var(--text-muted)] py-4">No memories found.</div>

  const categories = Array.from(new Set(data.map((m: any) => m.category)))
  const filtered = filter ? data.filter((m: any) => m.category === filter) : data

  return (
    <div className="space-y-3 w-full max-w-[720px]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          {data.length} Memories
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter(null)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${!filter ? 'bg-gray-200 text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-gray-100'}`}
          >All</button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${filter === cat ? 'bg-gray-200 text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-gray-100'}`}
            >
              {CATEGORY_ICONS[cat] || '📝'} {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((m: any) => (
          <button
            key={m.id}
            onClick={() => onAction(`Memory "${m.content.slice(0, 30)}..."에 대해 자세히 설명해줘.`)}
            className="w-full text-left p-3 border border-[var(--border-main)] rounded-xl hover:border-gray-300 hover:shadow-sm transition-all bg-white group"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[14px]">{CATEGORY_ICONS[m.category] || '📝'}</span>
                <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase">{m.category}</span>
                {(m as any).divisions?.name && (
                  <span className="text-[11px] text-[var(--text-muted)]">· {(m as any).divisions.name}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.confidence != null && (
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {Math.round(m.confidence * 100)}%
                  </span>
                )}
                {m.times_referenced > 0 && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    📎 {m.times_referenced}
                  </span>
                )}
              </div>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 group-hover:text-[var(--text-primary)] transition-colors">
              {m.content}
            </p>
            {m.tags && m.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {m.tags.slice(0, 5).map((tag: string, i: number) => (
                  <span key={i} className="text-[10px] bg-gray-100 text-[var(--text-muted)] px-1.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function CommandRenderer({ commandData, onAction }: { commandData: CommandData; onAction: (prompt: string) => void }) {
  switch (commandData.command) {
    case 'divisions': return <DivisionsView data={commandData.data} onAction={onAction} />
    case 'agents':    return <AgentsView data={commandData.data} onAction={onAction} />
    case 'decisions': return <DecisionsView data={commandData.data} onAction={onAction} />
    case 'memory':    return <MemoryView data={commandData.data} onAction={onAction} />
    default:          return null
  }
}

// ── Components ──

const ACTION_PILL_STYLES: Record<ActionType, { icon: typeof Terminal; color: string; bg: string; border: string; logBg: string; logText: string }> = {
  tool:   { icon: Terminal,  color: 'text-emerald-400', bg: 'bg-[#1a1a1c]', border: 'border-[#333]',        logBg: 'bg-[#111113]', logText: 'text-emerald-300/80' },
  file:   { icon: FileText,  color: 'text-blue-400',    bg: 'bg-[#1a1a1c]', border: 'border-[#333]',        logBg: 'bg-[#111113]', logText: 'text-blue-300/80' },
  api:    { icon: Globe,     color: 'text-amber-400',   bg: 'bg-[#1a1a1c]', border: 'border-[#333]',        logBg: 'bg-[#111113]', logText: 'text-amber-300/80' },
  search: { icon: Search,    color: 'text-purple-400',  bg: 'bg-[#1a1a1c]', border: 'border-[#333]',        logBg: 'bg-[#111113]', logText: 'text-purple-300/80' },
  db:     { icon: Cpu,       color: 'text-cyan-400',    bg: 'bg-[#1a1a1c]', border: 'border-[#333]',        logBg: 'bg-[#111113]', logText: 'text-cyan-300/80' },
  thought:{ icon: Brain,     color: 'text-gray-400',    bg: 'bg-gray-100',  border: 'border-gray-200',      logBg: 'bg-gray-50',   logText: 'text-gray-600' },
}

function ActionPill({ act }: { act: SubAction }) {
  const [open, setOpen] = useState(false)

  if (act.type === 'thought') {
    return (
      <div className="text-[13px] leading-relaxed text-[var(--text-secondary)] my-1.5 ml-1 pl-3 border-l-2 border-gray-200">
        {act.content}
      </div>
    )
  }

  const style = ACTION_PILL_STYLES[act.type] || ACTION_PILL_STYLES.tool
  const Icon = style.icon
  const hasDetails = act.log && act.log.trim().length > 0

  return (
    <div className="my-1.5 ml-1">
      <button
        onClick={() => hasDetails && setOpen(!open)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 ${style.bg} text-[#c8ccd0] rounded-lg text-[13px] font-medium transition-all border ${style.border} group ${hasDetails ? 'cursor-pointer hover:bg-[#2a2a2e]' : 'cursor-default'}`}
      >
        <Icon className={`w-3.5 h-3.5 ${style.color} opacity-80 group-hover:opacity-100 shrink-0`} />
        <span className="truncate max-w-[400px]">{act.title}</span>
        {hasDetails && (
          <ChevronDown className={`w-3 h-3 ml-1 text-gray-500 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && hasDetails && (
        <div className={`mt-1.5 ${style.logBg} border border-[#222] ${style.logText} font-mono text-[12px] p-3 rounded-lg overflow-x-auto leading-relaxed animate-in slide-in-from-top-1 duration-150`}>
          <pre className="m-0 break-words whitespace-pre-wrap">{act.log}</pre>
        </div>
      )}
    </div>
  )
}

function StepItem({ step, index, isLast }: { step: Step; index: number; isLast: boolean }) {
  const [expanded, setExpanded] = useState(index === 0)
  const isDone = step.status === 'done'

  return (
    <div className="relative">
      {/* Connecting line */}
      {!isLast && (
        <div className="absolute left-[11px] top-[26px] bottom-0 w-px bg-[var(--border-main)]" />
      )}

      <div className="flex items-start gap-3 group">
        {/* Status dot */}
        <div className={`mt-[5px] w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 z-10 border
          ${isDone
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-white border-blue-400 border-2'
          }`}
        >
          {isDone
            ? <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} />
            : <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          }
        </div>

        <div className="flex-1 pb-4 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 w-full text-left cursor-pointer outline-none hover:opacity-70 transition-opacity"
          >
            <span className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
              {step.name}
            </span>
            {step.subActions.length > 0 && (
              expanded
                ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            )}
          </button>

          {expanded && step.subActions.length > 0 && (
            <div className="mt-2 animate-in fade-in duration-200">
              {step.subActions.map(act =>
                <ActionPill key={act.id} act={act} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StepsTimeline({ steps }: { steps: Step[] }) {
  // Only show steps that contain actual tool/action calls (not pure thought)
  const actionSteps = steps.filter(s =>
    s.subActions.some(a => a.type !== 'thought')
  )
  if (!actionSteps || actionSteps.length === 0) return null

  return (
    <div className="mt-2 mb-4 w-full max-w-[720px]">
      <div className="space-y-0">
        {actionSteps.map((step, idx) => (
          <StepItem key={step.id} step={step} index={idx} isLast={idx === actionSteps.length - 1} />
        ))}
      </div>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose-omni break-words text-[15px] leading-[26px] text-[var(--text-primary)] max-w-[720px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          code: ({ className, children }) => {
            if (className?.includes('language-')) {
              return (
                <div className="rounded-lg overflow-hidden my-4 border border-[var(--border-main)]">
                  <div className="bg-gray-50 px-4 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-main)]">
                    {className.replace('language-', '')}
                  </div>
                  <code className="block bg-[#fafafa] text-[13px] px-4 py-3 font-mono overflow-x-auto leading-relaxed select-all">
                    {children}
                  </code>
                </div>
              )
            }
            return (
              <code className="bg-gray-100 text-[var(--text-primary)] rounded px-1.5 py-0.5 text-[13px] font-mono">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="my-0 overflow-hidden [&>code]:border-none [&>code]:my-0">{children}</pre>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
          li: ({ children, ...props }) => {
            const checked = (props as any).checked
            if (typeof checked === 'boolean') {
              return (
                <li className="text-[15px] list-none flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded border ${checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'}`}>
                    {checked && <Check className="w-3 h-3" />}
                  </span>
                  <span className={checked ? 'line-through text-[var(--text-muted)]' : ''}>{children}</span>
                </li>
              )
            }
            return <li className="text-[15px]">{children}</li>
          },
          h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-2">{children}</h3>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          hr: () => <hr className="my-4 border-t border-[var(--border-main)]" />,
          blockquote: ({ children }) => <blockquote className="border-l-3 border-gray-300 pl-3 my-3 text-[var(--text-secondary)] italic">{children}</blockquote>,
          a: ({ href, children }) => <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-[var(--border-main)]">
              <table className="w-full text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50 border-b border-[var(--border-main)]">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-[var(--border-main)]">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-gray-50/50 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-[13px] text-[var(--text-primary)]">{children}</td>,
          del: ({ children }) => <del className="text-[var(--text-muted)]">{children}</del>,
          input: (props) => {
            if ((props as any).type === 'checkbox') {
              const checked = (props as any).checked
              return (
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded border mr-1.5 ${checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'}`}>
                  {checked && <Check className="w-3 h-3" />}
                </span>
              )
            }
            return <input {...props} />
          },
        }}
      >{content}</ReactMarkdown>
    </div>
  )
}

// ── Sidebar ──
function ChatSidebar({
  sessions,
  activeSession,
  onNewChat,
  onSelectSession,
  collapsed,
  onToggle,
}: {
  sessions: ChatSession[]
  activeSession: string | null
  onNewChat: () => void
  onSelectSession: (id: string) => void
  collapsed: boolean
  onToggle: () => void
}) {
  if (collapsed) {
    return (
      <div className="hidden md:flex w-[48px] border-r border-[var(--border-main)] flex-col items-center py-3 gap-2 bg-white">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Expand sidebar">
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
        <button onClick={onNewChat} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="New chat">
          <Plus className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
      </div>
    )
  }

  return (
    <div className="hidden md:flex w-[260px] border-r border-[var(--border-main)] flex-col bg-white shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-2">
          <Command className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight uppercase">Control Tower</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onNewChat} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" title="New chat">
            <Plus className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
          <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" title="Collapse">
            <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      {/* Quick Commands */}
      <div className="p-3 border-b border-[var(--border-main)]">
        <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Quick Commands</div>
        <div className="space-y-0.5">
          {[
            { icon: Layers, label: 'Divisions', cmd: '/divisions' },
            { icon: Bot, label: 'Agents', cmd: '/agents' },
            { icon: Shield, label: 'Decisions', cmd: '/decisions' },
            { icon: Brain, label: 'Memory', cmd: '/memory' },
          ].map(item => (
            <button
              key={item.cmd}
              onClick={() => onSelectSession(item.cmd)}
              className="flex items-center gap-2.5 w-full px-2.5 py-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-gray-100 rounded-md transition-colors"
            >
              <item.icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>{item.label}</span>
              <span className="ml-auto text-[11px] text-[var(--text-muted)] font-mono">{item.cmd}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Recent</div>
        {sessions.length === 0 ? (
          <div className="text-[12px] text-[var(--text-muted)] py-4 text-center">No conversations yet</div>
        ) : (
          <div className="space-y-0.5">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className={`w-full text-left px-2.5 py-2 rounded-md text-[13px] transition-colors truncate ${
                  activeSession === s.id
                    ? 'bg-gray-100 text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-gray-50'
                }`}
              >
                <div className="truncate">{s.title}</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{s.preview}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border-main)]">
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Omni OS Online</span>
          <span className="ml-auto font-mono">v2.0</span>
        </div>
      </div>
    </div>
  )
}

// ── Input Actions (+ menu) ──
const INPUT_MENU_ITEMS = [
  {
    group: 'Division',
    items: [
      { icon: Layers, label: '새 Division 생성', insert: '새로운 Division을 만들고 싶어. ' },
      { icon: Activity, label: 'Division 현황 보기', insert: '/divisions' },
      { icon: Settings, label: 'Division 관리', insert: '운영 중인 Division을 관리하고 싶어. ' },
    ],
  },
  {
    group: 'Agent',
    items: [
      { icon: Bot, label: '에이전트 현황', insert: '/agents' },
      { icon: Zap, label: '에이전트 실행', insert: '에이전트를 실행해줘: ' },
      { icon: Globe, label: '웹 검색', insert: '웹에서 검색해줘: ' },
    ],
  },
  {
    group: 'System',
    items: [
      { icon: Shield, label: 'Critical Decision', insert: '/decisions' },
      { icon: Brain, label: 'Memory 검색', insert: '/memory' },
      { icon: BarChart3, label: '성과 리포트', insert: '이번 주 전체 Division 성과 리포트를 작성해줘.' },
    ],
  },
]

function InputActions({ onInsertText, onNewSession }: { onInsertText: (text: string) => void; onNewSession: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className="flex items-center gap-1">
      {/* + Menu Button */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            menuOpen ? 'bg-gray-200 text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-gray-100'
          }`}
          title="Actions"
        >
          <Plus className={`w-[18px] h-[18px] transition-transform ${menuOpen ? 'rotate-45' : ''}`} strokeWidth={2} />
        </button>

        {menuOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-[240px] bg-white border border-gray-200 rounded-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] overflow-hidden z-30 animate-in slide-in-from-bottom-2 fade-in duration-150">
            {INPUT_MENU_ITEMS.map(group => (
              <div key={group.group}>
                <div className="px-3 pt-2.5 pb-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  {group.group}
                </div>
                {group.items.map(item => (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (item.insert.startsWith('/')) {
                        onInsertText(item.insert)
                      } else {
                        onInsertText(item.insert)
                      }
                      setMenuOpen(false)
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                    <span className="text-[13px] text-[var(--text-secondary)]">{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
            <div className="border-t border-[var(--border-main)]">
              <button
                onClick={() => { onNewSession(); setMenuOpen(false) }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-[13px] text-[var(--text-secondary)]">새 대화 시작</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick access buttons */}
      <button
        onClick={() => onInsertText('/divisions')}
        className="h-7 px-2.5 rounded-full flex items-center gap-1.5 text-[var(--text-muted)] hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
        title="Divisions"
      >
        <Layers className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium hidden sm:inline">Divisions</span>
      </button>
      <button
        onClick={() => onInsertText('/agents')}
        className="h-7 px-2.5 rounded-full flex items-center gap-1.5 text-[var(--text-muted)] hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
        title="Agents"
      >
        <Bot className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium hidden sm:inline">Agents</span>
      </button>
    </div>
  )
}

// ── Main Page ──
export default function ControlTowerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [paletteIndex, setPaletteIndex] = useState(0)
  const showPalette = input.startsWith('/') && !input.includes(' ')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sendingRef = useRef(false)
  const pendingRef = useRef<string | null>(null)

  // Load sessions index + this session's messages + pending message from /control-tower
  useEffect(() => {
    try {
      const h = localStorage.getItem(SESSIONS_INDEX_KEY)
      if (h) setSessions(JSON.parse(h))
      const s = localStorage.getItem(msgKey(projectId))
      if (s) setMessages(JSON.parse(s))

      // Check for pending message from the landing page
      const pendingKey = `omni-ct-${projectId}-pending`
      const pending = localStorage.getItem(pendingKey)
      if (pending) {
        localStorage.removeItem(pendingKey)
        pendingRef.current = pending
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Save messages for this session
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(msgKey(projectId), JSON.stringify(messages.slice(-50)))
      // Update session index
      const firstUserMsg = messages.find(m => m.role === 'user')
      const title = firstUserMsg?.content.slice(0, 40) || 'New Chat'
      const preview = messages[messages.length - 1]?.content?.slice(0, 60) || ''
      setSessions(prev => {
        const existing = prev.findIndex(s => s.id === projectId)
        const entry: ChatSession = { id: projectId, title, timestamp: Date.now(), preview }
        const updated = existing >= 0
          ? prev.map((s, i) => i === existing ? entry : s)
          : [entry, ...prev]
        localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(updated.slice(0, 30)))
        return updated
      })
    }
  }, [messages, projectId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  useEffect(() => { inputRef.current?.focus() }, [])

  // Auto-send pending message from landing page
  useEffect(() => {
    if (pendingRef.current && !loading) {
      const text = pendingRef.current
      pendingRef.current = null
      setMessages(prev => [...prev, {
        id: `u-${Date.now()}`, role: 'user', content: text,
        steps: [], actions: [], isDone: true, timestamp: Date.now()
      }])
      setInput('')
      setLoading(true)
      sendingRef.current = true

      // Call API directly
      const history: Array<{ role: string; content: string }> = []
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })
        .then(res => res.json())
        .then(data => {
          const raw = data.reply || data.error || ''
          const { steps, body, isDone } = parseAssistantContent(raw)
          const { cleanText, actions } = extractActions(body)
          setMessages(prev => [...prev, {
            id: `a-${Date.now()}`, role: 'assistant', content: cleanText,
            steps, actions, isDone: isDone || true, timestamp: Date.now()
          }])
        })
        .catch(() => {})
        .finally(() => { setLoading(false); sendingRef.current = false })
    }
  }, [loading])

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    setPaletteIndex(0)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading || sendingRef.current) return
    sendingRef.current = true

    setMessages(prev => [...prev, {
      id: `u-${Date.now()}`, role: 'user', content: text,
      steps: [], actions: [], isDone: true, timestamp: Date.now()
    }])
    setInput('')
    setLoading(true)
    setStreamText('')

    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = 'auto'

    // Slash command handler
    const cmdKey = text.split(' ')[0].toLowerCase()
    if (SLASH_COMMANDS[cmdKey]) {
      try {
        const supabase = createClient()
        const commandData = await SLASH_COMMANDS[cmdKey](supabase)
        const countLabel = Array.isArray(commandData.data) ? `${commandData.data.length} items` : ''
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`, role: 'assistant',
          content: countLabel ? `Found ${countLabel}.` : '',
          steps: [], actions: [], isDone: true, timestamp: Date.now(),
          commandData,
        }])
      } catch (err) {
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`, role: 'assistant',
          content: 'Failed to fetch data. Check your connection.',
          steps: [], actions: [], isDone: true, timestamp: Date.now(),
        }])
      }
      setLoading(false)
      sendingRef.current = false
      return
    }

    // Mock trigger
    if (text.includes('인사이트') || text.includes('플랜') || text.includes('테스트')) {
      const mockup = getMockResponse()
      let index = 0
      const timer = setInterval(() => {
        setStreamText(mockup.slice(0, index))
        index += 12
        if (index > mockup.length + 12) {
          clearInterval(timer)
          const { steps, body, isDone } = parseAssistantContent(mockup)
          setMessages(prev => [...prev, {
            id: `a-${Date.now()}`, role: 'assistant', content: body,
            steps, actions: [], isDone: true, timestamp: Date.now()
          }])
          setStreamText('')
          setLoading(false)
          sendingRef.current = false
        }
      }, 8)
      return
    }

    try {
      // Build conversation history for context
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })
      if (!res.ok) { setLoading(false); sendingRef.current = false; return }

      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream')) {
        // Streaming response — show tokens as they arrive
        const reader = res.body?.getReader()
        if (!reader) { setLoading(false); sendingRef.current = false; return }
        const decoder = new TextDecoder()
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          for (const line of decoder.decode(value, { stream: true }).split('\n')) {
            if (!line.startsWith('data: ')) continue
            try {
              const json = JSON.parse(line.slice(6))
              if (json.delta) { fullText += json.delta; setStreamText(fullText) }
              if (json.done && json.reply) fullText = json.reply
            } catch {}
          }
        }

        const { steps, body, isDone } = parseAssistantContent(fullText)
        const { cleanText, actions } = extractActions(body)
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`, role: 'assistant', content: cleanText,
          steps, actions, isDone: isDone || true, timestamp: Date.now()
        }])
      } else {
        // JSON response
        const data = await res.json()
        const raw = data.reply || data.error || ''
        const { steps, body, isDone } = parseAssistantContent(raw)
        const { cleanText, actions } = extractActions(body)
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`, role: 'assistant', content: cleanText,
          steps, actions, isDone: isDone || true, timestamp: Date.now()
        }])
      }
    } catch {} finally {
      setLoading(false)
      setStreamText('')
      sendingRef.current = false
    }
  }, [input, loading, messages])

  const getFilteredPaletteCount = useCallback(() => {
    if (!showPalette) return 0
    const query = input.slice(1).toLowerCase()
    return COMMAND_PALETTE.filter(c => c.name.includes(query) || c.description.toLowerCase().includes(query)).length
  }, [input, showPalette])

  const selectPaletteCommand = useCallback((cmd: string) => {
    setInput(cmd)
    setPaletteIndex(0)
    setTimeout(() => sendMessage(), 50)
  }, [sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showPalette) {
      const count = getFilteredPaletteCount()
      if (e.key === 'ArrowDown') { e.preventDefault(); setPaletteIndex(i => (i + 1) % count) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setPaletteIndex(i => (i - 1 + count) % count) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        const query = input.slice(1).toLowerCase()
        const filtered = COMMAND_PALETTE.filter(c => c.name.includes(query) || c.description.toLowerCase().includes(query))
        if (filtered[paletteIndex]) selectPaletteCommand('/' + filtered[paletteIndex].name)
        return
      }
      else if (e.key === 'Escape') { setInput(''); setPaletteIndex(0) }
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearChat = () => {
    const newId = crypto.randomUUID().slice(0, 8)
    router.push(`/control-tower/${newId}`)
  }

  const handleSuggestion = (prompt: string) => {
    setInput(prompt)
    setTimeout(() => {
      sendMessage()
    }, 0)
  }

  const liveData = streamText ? parseAssistantContent(streamText) : null
  const isEmpty = messages.length === 0 && !loading

  return (
    <div className="flex w-full h-full overflow-hidden -mt-px">
      <ChatSidebar
        sessions={sessions}
        activeSession={projectId}
        onNewChat={clearChat}
        onSelectSession={(id) => {
          if (id.startsWith('/')) {
            setInput(id)
            setTimeout(() => sendMessage(), 50)
          } else {
            router.push(`/control-tower/${id}`)
          }
        }}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(prev => !prev)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 relative bg-white">

        {/* Top bar */}
        <div className="shrink-0 flex items-center px-6 py-3">
          <span className="text-[15px] font-semibold text-[var(--text-primary)]">Omni 1.0</span>
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto px-4 md:px-8 pt-4 pb-44 scroll-smooth ${isEmpty ? 'flex items-center justify-center' : ''}`}>
          <div className={`max-w-[800px] ${isEmpty ? 'w-full' : 'mx-auto'}`}>

            {/* Empty State */}
            {isEmpty && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-12">
                  <img src="/logo.png" alt="Omni" className="w-14 h-14 mb-5" />
                  <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight text-[var(--text-primary)] mb-2">
                    What can I do for you?
                  </h1>
                  <p className="text-[15px] text-[var(--text-muted)] max-w-[400px] mx-auto">
                    Division 관리, 에이전트 운영, 전략 분석 — 모든 것을 여기서.
                  </p>
                </div>

                {/* Suggestion Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-[600px] mx-auto">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(s.prompt)}
                      className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl text-left hover:border-gray-300 hover:shadow-sm transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
                        <s.icon className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                      <span className="text-[13px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message List */}
            {messages.map(msg => (
              <div key={msg.id} className="mb-6 animate-in fade-in slide-in-from-bottom-1 duration-200">
                {msg.role === 'user' && (
                  <div className="flex justify-end mb-2">
                    <div className="max-w-[75%] bg-[var(--text-primary)] text-white rounded-2xl rounded-br-md px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                )}

                {msg.role === 'assistant' && (
                  <div className="flex items-start gap-3">
                    <img src="/logo.png" alt="Omni" className="w-7 h-7 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px] font-semibold text-[var(--text-primary)]">Omni</span>
                      </div>
                      {/* Process toggle — only steps with actual tool calls */}
                      {msg.steps.length > 0 && <StepsTimeline steps={msg.steps} />}

                      {/* Result — thoughts from non-tool steps + body content */}
                      {(() => {
                        // Extract thought text from steps that have no tool actions
                        const thoughtOnlyText = msg.steps
                          .filter(s => !s.subActions.some(a => a.type !== 'thought'))
                          .flatMap(s => s.subActions.filter(a => a.type === 'thought').map(a => a.content || ''))
                          .join('\n\n')
                        const fullContent = [thoughtOnlyText, msg.content].filter(Boolean).join('\n\n')

                        if (msg.commandData) {
                          return (
                            <CommandRenderer
                              commandData={msg.commandData}
                              onAction={(prompt) => { setInput(prompt); setTimeout(() => sendMessage(), 0) }}
                            />
                          )
                        }
                        if (fullContent.trim()) {
                          return <MarkdownContent content={fullContent.trim()} />
                        }
                        return null
                      })()}

                      {/* Inline Actions */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {msg.actions.map(action => (
                            <button
                              key={action.id}
                              onClick={() => {
                                setInput(`[Action: ${action.type}] ${action.label}`)
                                setTimeout(() => sendMessage(), 0)
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[12px] font-medium hover:bg-blue-100 transition-colors border border-blue-200"
                            >
                              <Zap className="w-3 h-3" />
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Streaming / Loading */}
            {loading && (
              <div className="flex items-start gap-3 mb-6 animate-in fade-in duration-200">
                <img src="/logo.png" alt="Omni" className="w-7 h-7 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[14px] font-semibold text-[var(--text-primary)]">Omni</span>
                    <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  </div>

                  {liveData && liveData.steps.length > 0 && <StepsTimeline steps={liveData.steps} />}

                  {liveData && liveData.body ? (
                    <div className="text-[15px] leading-relaxed text-[var(--text-primary)]">
                      <MarkdownContent content={liveData.body} />
                      <span className="inline-block w-[3px] h-[18px] ml-0.5 align-middle bg-black animate-pulse rounded-sm" />
                    </div>
                  ) : !liveData?.steps?.length && (
                    <div className="flex items-center gap-2 h-8 text-[13px] text-[var(--text-muted)]">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                      </div>
                      <span>Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area — Manus-style floating pill */}
        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-5 pt-8 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
          <div className="max-w-[800px] mx-auto pointer-events-auto relative">
            {showPalette && (
              <CommandPalette
                filter={input}
                onSelect={selectPaletteCommand}
                selectedIndex={paletteIndex}
              />
            )}
            <div className="bg-white border border-gray-200 shadow-[0_4px_32px_-8px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask Omni anything — Division 관리, 에이전트 운영, 전략 분석..."
                rows={1}
                className="w-full px-5 pt-4 pb-1 bg-transparent text-[15px] leading-relaxed placeholder-gray-400 resize-none focus:outline-none"
                style={{ maxHeight: '200px', minHeight: '44px' }}
              />

              <div className="flex justify-between items-center px-3 pb-2.5 pt-0.5">
                <InputActions
                  onInsertText={(text) => { setInput(prev => prev + text); inputRef.current?.focus() }}
                  onNewSession={clearChat}
                />

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 text-[11px] text-[var(--text-muted)] mr-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Enter</kbd>
                    <span>to send</span>
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-95 ${
                      input.trim() && !loading
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center mt-2">
              <span className="text-[11px] text-[var(--text-muted)]">
                Omni Agent OS — All functions available through chat
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
