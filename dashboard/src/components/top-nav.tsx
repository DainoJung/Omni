'use client'

import { usePathname } from 'next/navigation'
import { Layers, ShieldAlert, Brain, TrendingUp, Plus, ChevronRight } from 'lucide-react'

const routeLabels: Record<string, string> = {
  '/': 'Command Center',
  '/proposal': 'New Division',
  '/decisions': 'Decisions',
  '/memory': 'Memory',
  '/strategy': 'Strategy',
}

export function TopNav({
  pendingDecisionCount,
  divisionMap,
}: {
  pendingDecisionCount: number
  divisionMap: Record<string, string>
}) {
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <header className="h-14 border-b border-[var(--border)] bg-white/80 backdrop-blur-md flex items-center justify-between px-6 z-50 shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-4">
        <a href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--text-primary)] rounded flex items-center justify-center text-white">
            <Layers size={18} />
          </div>
          <h1 className="font-[family-name:var(--font-mono)] text-sm font-bold tracking-tighter uppercase">
            OMNI Agent OS
          </h1>
        </a>
      </div>

      {/* Center: Breadcrumbs (sub-pages only) */}
      {!isHome && (
        <div className="flex items-center gap-1.5 text-sm font-[family-name:var(--font-mono)]">
          <a href="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xs uppercase tracking-wider">
            OMNI
          </a>
          <ChevronRight size={14} className="text-[var(--text-muted)]" />
          <span className="text-[var(--text-primary)] text-xs uppercase tracking-wider">
            {getPageLabel(pathname, divisionMap)}
          </span>
        </div>
      )}

      {isHome && (
        <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-widest text-[var(--text-muted)]">
          Command Center
        </span>
      )}

      {/* Right: Nav + Status */}
      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1">
          <NavLink href="/decisions" icon={<ShieldAlert size={14} />} label="Decisions" badge={pendingDecisionCount} />
          <NavLink href="/memory" icon={<Brain size={14} />} label="Memory" />
          <NavLink href="/strategy" icon={<TrendingUp size={14} />} label="Strategy" />
        </nav>

        <div className="w-px h-6 bg-[var(--border)]" />

        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-primary)] rounded-full border border-[var(--border)]">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-[family-name:var(--font-mono)] opacity-60 uppercase">Operational</span>
        </div>

        <a
          href="/proposal"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-blue)] text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          <span>New Division</span>
        </a>

        <div className="w-8 h-8 rounded-full bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20 flex items-center justify-center text-[var(--accent-blue)]">
          <span className="text-[10px] font-bold">JD</span>
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, icon, label, badge }: { href: string; icon: React.ReactNode; label: string; badge?: number }) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <a
      href={href}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-[family-name:var(--font-mono)] uppercase rounded-md transition-all relative ${
        active
          ? 'bg-[var(--bg-primary)] text-[var(--accent-blue)] font-bold'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent-yellow)] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </a>
  )
}

function getPageLabel(pathname: string, divisionMap: Record<string, string>): string {
  if (routeLabels[pathname]) return routeLabels[pathname]

  const divMatch = pathname.match(/^\/division\/(.+)$/)
  if (divMatch) return divisionMap[divMatch[1]] || 'Division'

  const agentMatch = pathname.match(/^\/agent\/(.+)$/)
  if (agentMatch) return 'Agent Detail'

  return pathname.slice(1)
}
