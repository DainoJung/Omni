'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Activity } from 'lucide-react'

export function FooterBar() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [timeStr, setTimeStr] = useState('')

  useEffect(() => {
    setTimeStr(new Date().toLocaleTimeString())
    const timer = setInterval(() => setTimeStr(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!isHome) return null

  return (
    <footer className="h-8 border-t border-[var(--border)] bg-white flex items-center justify-between px-6 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase opacity-60">
            Engine: OpenClaw Gateway
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)]" />
          <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase opacity-60">
            DB: Supabase
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-purple)]" />
          <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase opacity-60">
            LLM: GPT-5
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase opacity-40">
          Last Sync: {timeStr || '—'}
        </span>
        <div className="flex items-center gap-1">
          <Activity size={10} className="text-[var(--accent-blue)]" />
          <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase opacity-60">
            Phase 0
          </span>
        </div>
      </div>
    </footer>
  )
}
