'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Command, ChevronRight } from 'lucide-react'

interface ChatSession {
  id: string
  title: string
  timestamp: number
  preview: string
}

const SESSIONS_INDEX_KEY = 'omni-ct-sessions'

export default function ControlTowerNew() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const sent = useRef(false)

  useEffect(() => {
    try {
      const h = localStorage.getItem(SESSIONS_INDEX_KEY)
      if (h) setSessions(JSON.parse(h))
    } catch {}
  }, [])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || sent.current) return
    sent.current = true

    const newId = crypto.randomUUID().slice(0, 8)
    localStorage.setItem(`omni-ct-${newId}-pending`, text)
    router.push(`/control-tower/${newId}`)
  }, [input, router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const newChat = () => {
    setInput('')
    sent.current = false
  }

  return (
    <div className="flex w-full h-full overflow-hidden -mt-px">

      {/* Sidebar */}
      {sidebarCollapsed ? (
        <div className="hidden md:flex w-[48px] border-r border-[var(--border-main)] flex-col items-center py-3 gap-2 bg-white">
          <button onClick={() => setSidebarCollapsed(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
          <button onClick={newChat} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Plus className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>
      ) : (
        <div className="hidden md:flex w-[260px] border-r border-[var(--border-main)] flex-col bg-white shrink-0">
          <div className="flex items-center justify-between p-3 border-b border-[var(--border-main)]">
            <div className="flex items-center gap-2">
              <Command className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight uppercase">Control Tower</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={newChat} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" title="New chat">
                <Plus className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
              <button onClick={() => setSidebarCollapsed(true)} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" title="Collapse">
                <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Recent</div>
            {sessions.length === 0 ? (
              <div className="text-[12px] text-[var(--text-muted)] py-4 text-center">No conversations yet</div>
            ) : (
              <div className="space-y-0.5">
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => router.push(`/control-tower/${s.id}`)}
                    className="w-full text-left px-2.5 py-2 rounded-md text-[13px] text-[var(--text-secondary)] hover:bg-gray-50 transition-colors truncate"
                  >
                    <div className="truncate">{s.title}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{s.preview}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[var(--border-main)]">
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Omni OS Online</span>
              <span className="ml-auto font-mono">v1.0</span>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative bg-white" suppressHydrationWarning>
        <div className="shrink-0 absolute top-0 left-0 px-6 py-3">
          <span className="text-[15px] font-semibold text-[var(--text-primary)]">Omni 1.0</span>
        </div>

        <div className="w-full max-w-[800px] px-4 md:px-8">
          <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight text-[var(--text-primary)] mb-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            What can I do for you?
          </h1>

          <div className="bg-white border border-gray-200 shadow-[0_4px_32px_-8px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden" suppressHydrationWarning>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Omni anything..."
              rows={1}
              autoFocus
              className="w-full px-5 pt-4 pb-1 bg-transparent text-[15px] leading-relaxed placeholder-gray-400 resize-none focus:outline-none"
              style={{ maxHeight: '200px', minHeight: '44px' }}
            />
            <div className="flex justify-end items-center px-3 pb-2.5 pt-0.5">
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-95 ${
                  input.trim() ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-400'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
