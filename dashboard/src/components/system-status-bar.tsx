'use client'

import { usePathname } from 'next/navigation'
import { ChevronRight, Circle } from 'lucide-react'

const routeLabels: Record<string, string> = {
  '/': 'Command Center',
  '/proposal': 'New Division',
  '/decisions': 'Decisions',
  '/memory': 'Memory',
  '/strategy': 'Strategy',
}

export function SystemStatusBar({
  divisionMap,
}: {
  divisionMap: Record<string, string>
}) {
  const pathname = usePathname()

  const breadcrumbs = buildBreadcrumbs(pathname, divisionMap)

  return (
    <header
      className="flex items-center justify-between px-6 border-b border-[var(--border)] bg-[var(--bg-secondary)] shrink-0"
      style={{ height: 'var(--topbar-height)' }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="text-[var(--text-muted)]" />}
            {crumb.href ? (
              <a
                href={crumb.href}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {crumb.label}
              </a>
            ) : (
              <span className="text-[var(--text-primary)]">{crumb.label}</span>
            )}
          </span>
        ))}
      </div>

      {/* System Status */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <Circle size={6} fill="var(--accent-green)" className="text-[var(--accent-green)] animate-pulse-status" />
        <span>System Online</span>
      </div>
    </header>
  )
}

function buildBreadcrumbs(
  pathname: string,
  divisionMap: Record<string, string>
): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = []

  if (pathname === '/') {
    crumbs.push({ label: 'Command Center' })
    return crumbs
  }

  crumbs.push({ label: 'Command Center', href: '/' })

  if (routeLabels[pathname]) {
    crumbs.push({ label: routeLabels[pathname] })
    return crumbs
  }

  // /division/[id]
  const divMatch = pathname.match(/^\/division\/(.+)$/)
  if (divMatch) {
    const divId = divMatch[1]
    const divName = divisionMap[divId] || 'Division'
    crumbs.push({ label: divName })
    return crumbs
  }

  // /agent/[id]
  const agentMatch = pathname.match(/^\/agent\/(.+)$/)
  if (agentMatch) {
    crumbs.push({ label: 'Agent Detail' })
    return crumbs
  }

  crumbs.push({ label: pathname })
  return crumbs
}
