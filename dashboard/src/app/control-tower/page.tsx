'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Bot, Clock, CheckCircle2, ChevronDown, ChevronUp, Settings, Brain, Zap, Globe, Search, BarChart3, Play, Pause, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// ── Types ──

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

// ── Constants ──

const STORAGE_KEY = 'omni-chat-messages'
const SESSION_KEY = 'omni-chat-session'

// ── Slash Commands ──

interface SlashCommand {
  command: string
  label: string
  description: string
  template: string
}

const SLASH_COMMANDS: SlashCommand[] = [
  { command: '/status', label: '현황', description: '전체 시스템 현황 조회', template: '전체 현황 알려줘' },
  { command: '/create', label: '생성', description: '새 Division 대화 시작', template: '새로운 Division을 만들고 싶어.' },
  { command: '/pipeline', label: '파이프라인', description: 'Division 파이프라인 실행', template: 'Division 파이프라인 실행해' },
  { command: '/pause', label: '일시정지', description: 'Division 일시정지', template: 'Division 일시정지해줘' },
  { command: '/resume', label: '재개', description: 'Division 재개', template: 'Division 재개해줘' },
  { command: '/delete', label: '삭제', description: 'Division 완전 삭제', template: 'Division 삭제해줘' },
  { command: '/memory', label: '메모리', description: 'Institutional Memory 검색', template: '관련 교훈 검색해줘: ' },
  { command: '/cost', label: '비용', description: 'LLM 비용 요약', template: '비용 현황 알려줘' },
  { command: '/decisions', label: '결정', description: '대기 중 Critical Decision', template: '대기 중인 결정 사항 알려줘' },
]

// ── Inline Action Parser ──

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

// ── Step Parser ──

const STEP_GLOBAL_REGEX = /\[STEP:(tool|agent|think|done)(?::(시작|완료))?(?::([^:\]]+))?(?::([^\]]+))?\]/g

function parseAssistantContent(text: string): { steps: Step[]; body: string; isDone: boolean } {
  const lines = text.split('\n')
  const steps: Step[] = []
  const bodyLines: string[] = []
  let isDone = false
  let stepCounter = 0

  for (const line of lines) {
    const markers: Array<{ type: string; status: string; name: string; desc: string }> = []
    const regex = new RegExp(STEP_GLOBAL_REGEX.source, 'g')
    let match: RegExpExecArray | null
    while ((match = regex.exec(line)) !== null) {
      markers.push({ type: match[1], status: match[2] || '', name: match[3] || '', desc: match[4] || '' })
    }

    if (markers.length > 0) {
      const remaining = line.replace(new RegExp(STEP_GLOBAL_REGEX.source, 'g'), '').trim()
      if (remaining) bodyLines.push(remaining)

      for (const m of markers) {
        if (m.type === 'done') { isDone = true; continue }
        const parsed = {
          type: m.type as 'tool' | 'agent' | 'think',
          status: (m.status === '완료' ? 'done' : 'running') as 'running' | 'done',
          name: m.name,
          description: m.desc,
        }
        const existing = steps.find(s => s.name === parsed.name && s.type === parsed.type)
        if (existing) {
          existing.status = parsed.status
          existing.description = parsed.description || existing.description
        } else {
          steps.push({ id: `step-${stepCounter++}`, ...parsed })
        }
      }
    } else {
      bodyLines.push(line)
    }
  }

  return { steps, body: bodyLines.join('\n').trim(), isDone }
}

// ── SSE Parser ──

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

// ── Sub Components ──

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
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors py-1">
        {allDone
          ? <CheckCircle2 className="w-4 h-4 text-[var(--accent-green)] shrink-0" />
          : <Loader2 className="w-4 h-4 text-[var(--accent-blue)] animate-spin shrink-0" />}
        <span>{summary || 'Processing'}</span>
        <span className="text-[var(--text-muted)]">({steps.length})</span>
        {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      {expanded && (
        <div className="mt-1 ml-2 border-l-2 border-[var(--border)] pl-3 space-y-1.5">
          {steps.map(step => (
            <div key={step.id} className="flex items-start gap-2 text-xs">
              {step.status === 'running'
                ? <Loader2 className="w-4 h-4 text-[var(--accent-blue)] animate-spin shrink-0" />
                : <CheckCircle2 className="w-4 h-4 text-[var(--accent-green)] shrink-0" />}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  {step.type === 'tool' ? <Settings className="w-3.5 h-3.5" /> : step.type === 'agent' ? <Zap className="w-3.5 h-3.5" /> : step.type === 'think' ? <Brain className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                  <span className="font-medium">{step.name}</span>
                </div>
                {step.description && <p className="text-[var(--text-muted)] mt-0.5 truncate">{step.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──

export default function ControlTowerPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [streamText, setStreamText] = useState('')
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { try { const s = localStorage.getItem(STORAGE_KEY); if (s) setMessages(JSON.parse(s)); const ss = localStorage.getItem(SESSION_KEY); if (ss) setSessionId(ss) } catch {} }, [])
  useEffect(() => { if (messages.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))) }, [messages])
  useEffect(() => { if (sessionId) localStorage.setItem(SESSION_KEY, sessionId) }, [sessionId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streamText])
  useEffect(() => { inputRef.current?.focus() }, [])

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
    if (showSlashMenu && e.key === 'Escape') { setShowSlashMenu(false); e.preventDefault(); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setShowSlashMenu(false); sendMessage() }
  }

  const handleInputChange = (val: string) => {
    setInput(val)
    if (val.startsWith('/')) { setShowSlashMenu(true); setSlashFilter(val.slice(1).toLowerCase()) }
    else { setShowSlashMenu(false) }
  }

  const handleAction = (action: InlineAction) => {
    const actionMsg = `[사용자 액션: ${action.type}] ${action.label}${action.data ? ` (${action.data})` : ''}`
    setInput(actionMsg)
    setTimeout(() => sendMessage(), 0)
  }

  const filteredCommands = SLASH_COMMANDS.filter(c =>
    !slashFilter || c.command.slice(1).includes(slashFilter) || c.label.includes(slashFilter) || c.description.includes(slashFilter)
  )

  const clearChat = () => { setMessages([]); setSessionId(null); localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(SESSION_KEY) }

  const liveData = streamText ? parseAssistantContent(streamText) : null

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.length === 0 && !loading && (
            <div className="text-center py-16 space-y-4">
              <Bot className="w-12 h-12 text-[var(--text-muted)] mx-auto" />
              <div>
                <h2 className="text-lg font-bold">Omni Control Tower</h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">Division 생성, 관리, 파이프라인 실행 등 모든 작업을 여기서 수행합니다</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-lg mx-auto pt-4">
                {[
                  { icon: <BarChart3 className="w-4 h-4" />, text: '전체 현황 알려줘' },
                  { icon: <Play className="w-4 h-4" />, text: '새로운 사업을 시작하고 싶어' },
                  { icon: <Search className="w-4 h-4" />, text: '비용 현황 알려줘' },
                ].map(h => (
                  <button
                    key={h.text}
                    onClick={() => { setInput(h.text); inputRef.current?.focus() }}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg hover:border-[var(--accent-blue)] transition-colors text-left"
                  >
                    <span className="text-[var(--text-muted)]">{h.icon}</span>
                    {h.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id}>
              {msg.role === 'user' && (
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-[var(--accent-blue)] text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
              )}
              {msg.role === 'system' && (
                <div className="bg-[var(--accent-red)]/10 text-[var(--accent-red)] text-xs rounded-lg px-3 py-2">{msg.content}</div>
              )}
              {msg.role === 'assistant' && (
                <div className="max-w-[85%]">
                  <StepsPanel steps={msg.steps} />
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-4 py-3">
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
                          table: ({ children }) => <div className="overflow-x-auto my-1.5"><table className="text-xs border-collapse w-full">{children}</table></div>,
                          th: ({ children }) => <th className="border border-[var(--border)] px-2 py-1 text-left bg-[var(--bg-tertiary)] font-medium">{children}</th>,
                          td: ({ children }) => <td className="border border-[var(--border)] px-2 py-1">{children}</td>,
                        }}
                      >{msg.content}</ReactMarkdown>
                    </div>
                  </div>

                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.actions.map(action => (
                        <button
                          key={action.id}
                          onClick={() => handleAction(action)}
                          disabled={loading}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 ${
                            action.type === 'approve' || action.type === 'confirm'
                              ? 'border-[var(--accent-green)] text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10'
                              : action.type === 'reject' || action.type === 'cancel'
                              ? 'border-[var(--accent-red)] text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10'
                              : 'border-[var(--accent-blue)] text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="max-w-[85%]">
              {liveData && liveData.steps.length > 0 && <StepsPanel steps={liveData.steps} />}
              {liveData && liveData.body ? (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="chat-markdown break-words text-sm leading-relaxed">
                    <ReactMarkdown>{liveData.body}</ReactMarkdown>
                  </div>
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
      </div>

      {/* Slash Menu */}
      {showSlashMenu && filteredCommands.length > 0 && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="max-w-3xl mx-auto px-4 py-2 flex flex-wrap gap-1.5">
            {filteredCommands.map(cmd => (
              <button
                key={cmd.command}
                onClick={() => { setInput(cmd.template); setShowSlashMenu(false); inputRef.current?.focus() }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded-md hover:border-[var(--accent-blue)] transition-colors"
              >
                <span className="font-medium text-[var(--accent-blue)]">{cmd.command}</span>
                <span className="text-[var(--text-muted)]">{cmd.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지 입력... ( / 로 커맨드)"
                rows={1}
                className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
                style={{ maxHeight: '120px' }}
              />
            </div>
            <div className="flex gap-2 shrink-0 pb-0.5">
              <button
                onClick={clearChat}
                className="p-2.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-primary)] transition-colors"
                title="초기화"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="p-2.5 bg-[var(--accent-blue)] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
