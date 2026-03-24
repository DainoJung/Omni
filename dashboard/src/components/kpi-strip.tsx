import { Building2, Bot, Activity, ShieldAlert, CircleDollarSign } from 'lucide-react'

interface KpiStripProps {
  activeDivisions: number
  totalAgents: number
  todayEvents: number
  pendingDecisions: number
  dailyCost: number
}

export function KpiStrip({
  activeDivisions,
  totalAgents,
  todayEvents,
  pendingDecisions,
  dailyCost,
}: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <MetricCard
        icon={<Building2 className="w-4 h-4" />}
        label="Active Divisions"
        value={String(activeDivisions)}
        highlight={activeDivisions > 0 ? 'green' : undefined}
      />
      <MetricCard
        icon={<Bot className="w-4 h-4" />}
        label="Total Agents"
        value={String(totalAgents)}
      />
      <MetricCard
        icon={<Activity className="w-4 h-4" />}
        label="Today Events"
        value={String(todayEvents)}
      />
      <MetricCard
        icon={<ShieldAlert className="w-4 h-4" />}
        label="Pending Decisions"
        value={String(pendingDecisions)}
        highlight={pendingDecisions > 0 ? 'yellow' : undefined}
      />
      <MetricCard
        icon={<CircleDollarSign className="w-4 h-4" />}
        label="Daily Cost"
        value={`₩${dailyCost.toLocaleString()}`}
      />
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: 'green' | 'yellow'
}) {
  const highlightColor =
    highlight === 'yellow'
      ? 'text-[var(--accent-yellow)]'
      : highlight === 'green'
        ? 'text-[var(--accent-green)]'
        : 'text-[var(--text-primary)]'

  const iconColor =
    highlight === 'yellow'
      ? 'text-[var(--accent-yellow)]'
      : highlight === 'green'
        ? 'text-[var(--accent-green)]'
        : 'text-[var(--text-muted)]'

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
      <div className={`flex items-center gap-1.5 mb-2 ${iconColor}`}>
        {icon}
        <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
      </div>
      <span className={`text-2xl font-bold font-[family-name:var(--font-mono)] ${highlightColor}`}>
        {value}
      </span>
    </div>
  )
}
