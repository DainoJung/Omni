'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, Send, X, Loader2, Bot, User, ChevronRight, ChevronDown, ChevronUp, GripVertical, CheckCircle2, Globe, Clock, Zap, Settings, Brain, Slash, BarChart3, Play, Pause, PlusCircle, Search, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// --- Types ---

interface Step {
  id: string
  type: 'tool' | 'agent' | 'think' | 'done'
  status: 'running' | 'done'
  name: string
  description: string
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  steps: Step[]
  actions: InlineAction[]
  isDone: boolean
  timestamp: number
}

// --- Constants ---

const STORAGE_KEY = 'omni-chat-messages'
const SESSION_KEY = 'omni-chat-session'
const WIDTH_KEY = 'omni-chat-width'
const MIN_WIDTH = 320
const MAX_WIDTH = 800
const DEFAULT_WIDTH = 420

// --- Slash Commands ---

interface SlashCommand {
  command: string
  label: string
  description: string
  icon: React.ReactNode
  template: string
}

const SLASH_COMMANDS: SlashCommand[] = [
  { command: '/status', label: '현황', description: '전체 시스템 현황 조회', icon: <BarChart3 className="w-3.5 h-3.5" />, template: '전체 현황 알려줘' },
  { command: '/create', label: '생성', description: '새 Division 대화 시작', icon: <PlusCircle className="w-3.5 h-3.5" />, template: '새로운 Division을 만들고 싶어.' },
  { command: '/pipeline', label: '파이프라인', description: 'Division 파이프라인 실행', icon: <Play className="w-3.5 h-3.5" />, template: 'Division 파이프라인 실행해' },
  { command: '/pause', label: '일시정지', description: 'Division 일시정지', icon: <Pause className="w-3.5 h-3.5" />, template: 'Division 일시정지해줘' },
  { command: '/resume', label: '재개', description: 'Division 재개', icon: <RotateCcw className="w-3.5 h-3.5" />, template: 'Division 재개해줘' },
  { command: '/memory', label: '메모리', description: 'Institutional Memory 검색', icon: <Search className="w-3.5 h-3.5" />, template: '관련 교훈 검색해줘: ' },
]

// --- Inline Action Parser ---
// Detects [ACTION:type:label:data] patterns in assistant responses

interface InlineAction {
  id: string
  type: string
  label: string
  data: string
}

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

// --- Step Marker Parser ---

const STEP_GLOBAL_REGEX = /\[STEP:(tool|agent|think|done)(?::(시작|완료))?(?::([^:\]]+))?(?::([^\]]+))?\]/g

function extractStepMarkers(line: string): Array<{ type: 'tool' | 'agent' | 'think' | 'done'; status: 'running' | 'done'; name: string; description: string }> {
  const markers: Array<{ type: 'tool' | 'agent' | 'think' | 'done'; status: 'running' | 'done'; name: string; description: string }> = []
  let match: RegExpExecArray | null
  const regex = new RegExp(STEP_GLOBAL_REGEX.source, 'g')
  while ((match = regex.exec(line)) !== null) {
    const [, type, statusKr, name, desc] = match
    markers.push({
      type: type as 'tool' | 'agent' | 'think' | 'done',
      status: statusKr === '완료' ? 'done' : type === 'done' ? 'done' : 'running',
      name: name || '',
      description: desc || '',
    })
  }
  return markers
}

function parseAssistantContent(text: string): { steps: Step[]; body: string; isDone: boolean } {
  const lines = text.split('\n')
  const steps: Step[] = []
  const bodyLines: string[] = []
  let isDone = false
  let stepCounter = 0

  for (const line of lines) {
    const markers = extractStepMarkers(line)
    if (markers.length > 0) {
      // 줄에서 STEP 마커를 제거한 나머지 텍스트
      const remaining = line.replace(STEP_GLOBAL_REGEX, '').trim()
      if (remaining) bodyLines.push(remaining)

      for (const parsed of markers) {
        if (parsed.type === 'done') {
          isDone = true
          continue
        }
        const existing = steps.find(s => s.name === parsed.name && s.type === parsed.type)
        if (existing) {
          existing.status = parsed.status
          existing.description = parsed.description || existing.description
        } else {
          steps.push({
            id: `step-${stepCounter++}`,
            type: parsed.type,
            status: parsed.status,
            name: parsed.name,
            description: parsed.description,
          })
        }
      }
    } else {
      bodyLines.push(line)
    }
  }

  return { steps, body: bodyLines.join('\n').trim(), isDone }
}

// --- SSE Parser ---

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

// --- Sub Components ---

function StepIcon({ step }: { step: Step }) {
  if (step.status === 'running') return <Loader2 className="w-4 h-4 text-[var(--accent-blue)] animate-spin shrink-0" />
  return <CheckCircle2 className="w-4 h-4 text-[var(--accent-green)] shrink-0" />
}

function StepTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'tool': return <Settings className="w-3.5 h-3.5" />
    case 'agent': return <Zap className="w-3.5 h-3.5" />
    case 'think': return <Brain className="w-3.5 h-3.5" />
    default: return <Globe className="w-3.5 h-3.5" />
  }
}

function StepsPanel({ steps }: { steps?: Step[] }) {
  const [expanded, setExpanded] = useState(false)
  if (!steps || steps.length === 0) return null

  const allDone = steps.every(s => s.status === 'done')
  const summary = [...new Set(steps.map(s => {
    if (s.type === 'tool') return '도구 실행'
    if (s.type === 'agent') return '에이전트 호출'
    if (s.type === 'think') return '분석'
    return ''
  }).filter(Boolean))].join(', ')

  return (
    <div className="mb-3">
      {/* Collapsible header */}
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors py-1">
        {allDone
          ? <CheckCircle2 className="w-4 h-4 text-[var(--accent-green)] shrink-0" />
          : <Loader2 className="w-4 h-4 text-[var(--accent-blue)] animate-spin shrink-0" />}
        <span>{summary || 'Processing'}</span>
        <span className="text-[var(--text-muted)]">({steps.length})</span>
        {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      {/* Step list */}
      {expanded && (
        <div className="mt-1 ml-2 border-l-2 border-[var(--border)] pl-3 space-y-1.5">
          {steps.map(step => (
            <div key={step.id} className="flex items-start gap-2 text-xs">
              <StepIcon step={step} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <StepTypeIcon type={step.type} />
                  <span className="font-medium">{step.name}</span>
                </div>
                {step.description && (
                  <p className="text-[var(--text-muted)] mt-0.5 truncate">{step.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  if (!content) return null
  return (
    <div className="chat-markdown break-words text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold mt-2.5 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-0.5">{children}</h3>,
          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          code: ({ className, children }) => {
            if (className?.includes('language-')) {
              return <code className="block bg-[var(--bg-tertiary)] rounded px-2 py-1.5 text-xs font-[family-name:var(--font-mono)] overflow-x-auto my-1.5">{children}</code>
            }
            return <code className="bg-[var(--bg-tertiary)] rounded px-1 py-0.5 text-xs font-[family-name:var(--font-mono)]">{children}</code>
          },
          pre: ({ children }) => <pre className="my-1.5">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-[var(--accent-blue)] pl-2 my-1.5 text-[var(--text-secondary)]">{children}</blockquote>,
          table: ({ children }) => <div className="overflow-x-auto my-1.5"><table className="text-xs border-collapse w-full">{children}</table></div>,
          th: ({ children }) => <th className="border border-[var(--border)] px-2 py-1 text-left bg-[var(--bg-tertiary)] font-medium">{children}</th>,
          td: ({ children }) => <td className="border border-[var(--border)] px-2 py-1">{children}</td>,
          hr: () => <hr className="border-[var(--border)] my-2" />,
          a: ({ href, children }) => <a href={href} className="text-[var(--accent-blue)] underline" target="_blank" rel="noopener noreferrer">{children}</a>,
        }}
      >{content}</ReactMarkdown>
    </div>
  )
}

// --- Main ---

export function ChatPanel() {
  const [collapsed, setCollapsed] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [dragging, setDragging] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { try { const s = localStorage.getItem(STORAGE_KEY); if (s) setMessages(JSON.parse(s)); const ss = localStorage.getItem(SESSION_KEY); if (ss) setSessionId(ss); const sw = localStorage.getItem(WIDTH_KEY); if (sw) setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parseInt(sw)))) } catch {} }, [])
  useEffect(() => { if (messages.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))) }, [messages])
  useEffect(() => { if (sessionId) localStorage.setItem(SESSION_KEY, sessionId) }, [sessionId])
  useEffect(() => { localStorage.setItem(WIDTH_KEY, String(width)) }, [width])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streamText])
  useEffect(() => { if (!collapsed) inputRef.current?.focus() }, [collapsed])

  useEffect(() => {
    if (!dragging) return
    const move = (e: MouseEvent) => { if (panelRef.current) setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, panelRef.current.getBoundingClientRect().right - e.clientX))) }
    const up = () => setDragging(false)
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up)
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.body.style.cursor = ''; document.body.style.userSelect = '' }
  }, [dragging])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text, steps: [], actions: [], isDone: true, timestamp: Date.now() }])
    setInput('')
    setLoading(true)
    setStreamText('')

    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, sessionId }) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.status }))
        setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'system', content: `오류: ${err.error}`, steps: [], actions: [], isDone: true, timestamp: Date.now() }])
        setLoading(false); return
      }

      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream')) {
        const reader = res.body?.getReader()
        if (!reader) { setLoading(false); return }
        const decoder = new TextDecoder()
        let fullText = ''
        let newResponseId: string | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          for (const { event, data } of parseSSEEvents(decoder.decode(value, { stream: true }))) {
            if (event === 'done' || !data) continue
            try {
              const p = JSON.parse(data)
              if (event === 'response.output_text.delta' && p.delta) { fullText += p.delta; setStreamText(fullText) }
              if (event === 'response.completed' && p.response?.id) newResponseId = p.response.id
            } catch {}
          }
        }

        if (newResponseId) setSessionId(newResponseId)
        const { steps, body, isDone } = parseAssistantContent(fullText)
        const { cleanText, actions } = extractActions(body)
        setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: cleanText, steps, actions, isDone, timestamp: Date.now() }])
      } else {
        const data = await res.json()
        if (data.responseId) setSessionId(data.responseId)
        const raw = data.reply || data.error || ''
        const { steps, body, isDone } = parseAssistantContent(raw)
        const { cleanText: ct2, actions: ac2 } = extractActions(body)
        setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: ct2, steps, actions: ac2, isDone, timestamp: Date.now() }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'system', content: `연결 오류: ${String(err)}`, steps: [], actions: [], isDone: true, timestamp: Date.now() }])
    } finally { setLoading(false); setStreamText('') }
  }, [input, loading, sessionId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlashMenu) {
      if (e.key === 'Escape') { setShowSlashMenu(false); e.preventDefault(); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setShowSlashMenu(false); sendMessage() }
  }

  const handleInputChange = (val: string) => {
    setInput(val)
    if (val.startsWith('/')) {
      setShowSlashMenu(true)
      setSlashFilter(val.slice(1).toLowerCase())
    } else {
      setShowSlashMenu(false)
    }
  }

  const selectSlashCommand = (cmd: SlashCommand) => {
    setInput(cmd.template)
    setShowSlashMenu(false)
    inputRef.current?.focus()
  }

  const handleAction = (action: InlineAction) => {
    // Send action as a user message to the Orchestrator
    const actionMsg = `[사용자 액션: ${action.type}] ${action.label}${action.data ? ` (${action.data})` : ''}`
    setInput(actionMsg)
    setTimeout(() => sendMessage(), 0)
  }

  const filteredCommands = SLASH_COMMANDS.filter(c =>
    !slashFilter || c.command.slice(1).includes(slashFilter) || c.label.includes(slashFilter) || c.description.includes(slashFilter)
  )

  const clearChat = () => { setMessages([]); setSessionId(null); localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(SESSION_KEY) }

  if (collapsed) {
    return <button onClick={() => setCollapsed(false)} className="fixed bottom-12 right-6 w-12 h-12 rounded-full bg-[var(--accent-blue)] text-white flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity z-50" title="Omni 컨트롤타워"><MessageSquare className="w-5 h-5" /></button>
  }

  // Parse streaming text for live steps
  const liveData = streamText ? parseAssistantContent(streamText) : null

  return (
    <div ref={panelRef} className="fixed top-14 right-0 bottom-8 border-l border-[var(--border)] bg-white/95 backdrop-blur-md flex shrink-0 z-40 shadow-2xl" style={{ width: `${width}px` }}>
      <div onMouseDown={() => setDragging(true)} className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 hover:bg-[var(--accent-blue)]/20 transition-colors ${dragging ? 'bg-[var(--accent-blue)]/30' : ''}`} />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="flex items-center gap-2"><Bot className="w-4 h-4 text-[var(--accent-blue)]" /><span className="text-sm font-medium">Omni 컨트롤타워</span></div>
          <div className="flex items-center gap-1">
            <button onClick={clearChat} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded" title="초기화"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            <button onClick={() => setCollapsed(true)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {messages.length === 0 && !loading && (
            <div className="text-center py-8 space-y-3">
              <Bot className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
              <p className="text-sm text-[var(--text-secondary)]">Omni 컨트롤타워</p>
              <p className="text-xs text-[var(--text-muted)]">자유롭게 대화하세요</p>
              <div className="space-y-1.5 pt-2">
                {['사업 아이디어 제안해줘', '전체 현황 알려줘', 'Division 하나 만들어볼까'].map(h => (
                  <button key={h} onClick={() => { setInput(h); inputRef.current?.focus() }} className="block w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg hover:border-[var(--accent-blue)] transition-colors">
                    <ChevronRight className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />{h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id}>
              {msg.role === 'user' && (
                <div className="flex justify-end"><div className="max-w-[85%] bg-[var(--accent-blue)] text-white rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words">{msg.content}</div></div>
              )}
              {msg.role === 'system' && (
                <div className="bg-[var(--accent-red)]/10 text-[var(--accent-red)] text-xs rounded-lg px-3 py-2">{msg.content}</div>
              )}
              {msg.role === 'assistant' && (
                <div>
                  {/* Steps panel */}
                  <StepsPanel steps={msg.steps} />

                  {/* Body */}
                  <div className="flex gap-2.5">
                    <Clock className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-1" />
                    <div className="min-w-0 flex-1"><MarkdownContent content={msg.content} /></div>
                  </div>

                  {/* Inline action buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-[var(--border)]">
                      {msg.actions.map(action => (
                        <button
                          key={action.id}
                          onClick={() => handleAction(action)}
                          disabled={loading}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 ${
                            action.type === 'approve' || action.type === 'confirm'
                              ? 'border-[var(--accent-green)] text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10'
                              : action.type === 'reject' || action.type === 'cancel' || action.type === 'sunset'
                              ? 'border-[var(--accent-red)] text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10'
                              : 'border-[var(--accent-blue)] text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Done indicator */}
                  {msg.isDone && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-3 pt-2 border-t border-[var(--border)]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                      Done
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Live streaming */}
          {loading && (
            <div>
              {liveData && liveData.steps.length > 0 && <StepsPanel steps={liveData.steps} />}
              {liveData && liveData.body ? (
                <div className="flex gap-2.5">
                  <Clock className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-1" />
                  <div className="min-w-0 flex-1"><MarkdownContent content={liveData.body} /></div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Orchestrator 처리 중...
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Slash Command Menu */}
        {showSlashMenu && filteredCommands.length > 0 && (
          <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-1.5 max-h-48 overflow-y-auto">
            {filteredCommands.map(cmd => (
              <button
                key={cmd.command}
                onClick={() => selectSlashCommand(cmd)}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 text-left rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <span className="text-[var(--accent-blue)]">{cmd.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--text-primary)]">{cmd.command}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{cmd.label}</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{cmd.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex gap-2">
            <textarea ref={inputRef} value={input} onChange={e => handleInputChange(e.target.value)} onKeyDown={handleKeyDown} placeholder="메시지 입력... ( / 로 커맨드)" rows={1}
              className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--accent-blue)] transition-colors" style={{ maxHeight: '80px' }} />
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              className="px-3 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
