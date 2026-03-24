'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  ShieldAlert,
  Brain,
  TrendingUp,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Circle,
} from 'lucide-react'

interface Division {
  id: string
  name: string
  slug: string
  status: string
}

const statusColors: Record<string, string> = {
  operating: 'text-[var(--accent-green)]',
  building: 'text-[var(--accent-blue)]',
  designing: 'text-[var(--accent-purple)]',
  proposed: 'text-[var(--text-muted)]',
  paused: 'text-[var(--accent-yellow)]',
  sunset: 'text-[var(--accent-red)]',
}

export function Sidebar({
  divisions,
  pendingDecisionCount,
}: {
  divisions: Division[]
  pendingDecisionCount: number
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
      isActive(href)
        ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50'
    }`

  return (
    <aside
      className="flex flex-col h-screen border-r border-[var(--border)] bg-[var(--bg-secondary)] shrink-0 transition-all duration-200"
      style={{ width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-[var(--topbar-height)] border-b border-[var(--border)]">
        {!collapsed && (
          <span className="font-bold tracking-tight">
            <span className="text-[var(--accent-blue)]">OMNI</span>
            <span className="text-[var(--text-muted)] ml-1 text-xs font-normal">OS</span>
          </span>
        )}
        <button
          onClick={toggleCollapsed}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {/* Overview */}
        <a href="/" className={linkClass('/')}>
          <LayoutDashboard size={18} className="shrink-0" />
          {!collapsed && <span>Command Center</span>}
        </a>

        {/* Divisions */}
        {!collapsed && (
          <div className="pt-4 pb-1 px-3">
            <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest">
              Divisions
            </span>
          </div>
        )}
        {collapsed && <div className="my-2 mx-2 border-t border-[var(--border)]" />}

        {divisions.map((d) => (
          <a key={d.id} href={`/division/${d.id}`} className={linkClass(`/division/${d.id}`)}>
            <Circle
              size={8}
              fill="currentColor"
              className={`shrink-0 ${statusColors[d.status] ?? 'text-[var(--text-muted)]'}`}
            />
            {!collapsed && <span className="truncate">{d.name.replace(/^Division . — /, '')}</span>}
          </a>
        ))}

        {/* Operations */}
        {!collapsed && (
          <div className="pt-4 pb-1 px-3">
            <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest">
              Operations
            </span>
          </div>
        )}
        {collapsed && <div className="my-2 mx-2 border-t border-[var(--border)]" />}

        <a href="/decisions" className={linkClass('/decisions')}>
          <div className="relative shrink-0">
            <ShieldAlert size={18} />
            {pendingDecisionCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--accent-yellow)] text-[var(--bg-primary)] text-[9px] font-bold rounded-full flex items-center justify-center">
                {pendingDecisionCount}
              </span>
            )}
          </div>
          {!collapsed && <span>Decisions</span>}
        </a>

        {/* Intelligence */}
        {!collapsed && (
          <div className="pt-4 pb-1 px-3">
            <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest">
              Intelligence
            </span>
          </div>
        )}
        {collapsed && <div className="my-2 mx-2 border-t border-[var(--border)]" />}

        <a href="/memory" className={linkClass('/memory')}>
          <Brain size={18} className="shrink-0" />
          {!collapsed && <span>Memory</span>}
        </a>

        <a href="/strategy" className={linkClass('/strategy')}>
          <TrendingUp size={18} className="shrink-0" />
          {!collapsed && <span>Strategy</span>}
        </a>
      </nav>

      {/* New Division CTA */}
      <div className="p-2 border-t border-[var(--border)]">
        <a
          href="/proposal"
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            isActive('/proposal')
              ? 'bg-[var(--accent-blue)] text-white'
              : 'border border-[var(--accent-blue)] text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10'
          }`}
        >
          <Plus size={16} />
          {!collapsed && <span>New Division</span>}
        </a>
      </div>
    </aside>
  )
}
