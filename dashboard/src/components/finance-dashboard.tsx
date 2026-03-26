'use client'

import { useState, useMemo } from 'react'
import {
  CircleDollarSign, TrendingDown, TrendingUp, Cpu, BarChart3,
  ArrowUpRight, ArrowDownRight, Building2, Bot, Zap, Clock, Filter,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────
interface Division {
  id: string
  name: string
  slug: string
  status: string
}

interface LLMUsageRow {
  id: string
  division_id: string | null
  agent_id: string | null
  provider: string
  model: string
  endpoint: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
  caller: string
  metadata: Record<string, unknown>
  latency_ms: number | null
  created_at: string
}

interface MetricRow {
  division_id: string
  metric_name: string
  metric_value: number
  period: string
  period_start: string
  metadata: Record<string, unknown>
}

interface Props {
  divisions: Division[]
  llmUsage: LLMUsageRow[]
  dailyMetrics: MetricRow[]
  todayTotalCost: number
}

// ──────────────────────────────────────
// Color palette
// ──────────────────────────────────────
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#06B6D4', '#D97706']

function formatUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n > 0) return `$${n.toFixed(4)}`
  return '$0.00'
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// ──────────────────────────────────────
// Main Component
// ──────────────────────────────────────
export function FinanceDashboard({ divisions, llmUsage, dailyMetrics, todayTotalCost }: Props) {
  const [periodDays, setPeriodDays] = useState(7)
  const [selectedDivision, setSelectedDivision] = useState<string>('all')

  // ── Filter data by period and division ──
  const filtered = useMemo(() => {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
    let usage = llmUsage.filter(r => new Date(r.created_at) >= since)
    if (selectedDivision !== 'all') {
      usage = usage.filter(r => r.division_id === selectedDivision)
    }
    return usage
  }, [llmUsage, periodDays, selectedDivision])

  // ── KPI calculations ──
  const kpis = useMemo(() => {
    const totalCost = filtered.reduce((s, r) => s + Number(r.cost_usd), 0)
    const totalTokens = filtered.reduce((s, r) => s + r.total_tokens, 0)
    const totalCalls = filtered.length
    const avgLatency = filtered.filter(r => r.latency_ms).length > 0
      ? Math.round(filtered.reduce((s, r) => s + (r.latency_ms || 0), 0) / filtered.filter(r => r.latency_ms).length)
      : 0

    // Revenue from division_metrics
    const revenueMetrics = dailyMetrics.filter(m => m.metric_name === 'revenue')
    const totalRevenue = selectedDivision === 'all'
      ? revenueMetrics.reduce((s, m) => s + Number(m.metric_value), 0)
      : revenueMetrics.filter(m => m.division_id === selectedDivision).reduce((s, m) => s + Number(m.metric_value), 0)

    return { totalCost, totalTokens, totalCalls, avgLatency, totalRevenue, profit: totalRevenue - totalCost }
  }, [filtered, dailyMetrics, selectedDivision])

  // ── Daily cost trend ──
  const dailyCostTrend = useMemo(() => {
    const byDay: Record<string, { cost: number; revenue: number; calls: number; tokens: number }> = {}
    for (const r of filtered) {
      const day = r.created_at.split('T')[0]
      if (!byDay[day]) byDay[day] = { cost: 0, revenue: 0, calls: 0, tokens: 0 }
      byDay[day].cost += Number(r.cost_usd)
      byDay[day].calls++
      byDay[day].tokens += r.total_tokens
    }
    // Add revenue data
    const revenueMetrics = dailyMetrics.filter(m => m.metric_name === 'revenue')
    for (const m of revenueMetrics) {
      if (selectedDivision !== 'all' && m.division_id !== selectedDivision) continue
      const day = m.period_start
      if (!byDay[day]) byDay[day] = { cost: 0, revenue: 0, calls: 0, tokens: 0 }
      byDay[day].revenue += Number(m.metric_value)
    }
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, data]) => ({ day: day.slice(5), ...data, profit: data.revenue - data.cost }))
  }, [filtered, dailyMetrics, selectedDivision])

  // ── Cost by model ──
  const costByModel = useMemo(() => {
    const byModel: Record<string, { cost: number; calls: number; tokens: number }> = {}
    for (const r of filtered) {
      if (!byModel[r.model]) byModel[r.model] = { cost: 0, calls: 0, tokens: 0 }
      byModel[r.model].cost += Number(r.cost_usd)
      byModel[r.model].calls++
      byModel[r.model].tokens += r.total_tokens
    }
    return Object.entries(byModel)
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.cost - a.cost)
  }, [filtered])

  // ── Cost by division ──
  const costByDivision = useMemo(() => {
    const byDiv: Record<string, { cost: number; revenue: number; calls: number }> = {}
    for (const r of filtered) {
      const divId = r.division_id || 'system'
      if (!byDiv[divId]) byDiv[divId] = { cost: 0, revenue: 0, calls: 0 }
      byDiv[divId].cost += Number(r.cost_usd)
      byDiv[divId].calls++
    }
    // Add revenue
    const revenueMetrics = dailyMetrics.filter(m => m.metric_name === 'revenue')
    for (const m of revenueMetrics) {
      const divId = m.division_id || 'system'
      if (!byDiv[divId]) byDiv[divId] = { cost: 0, revenue: 0, calls: 0 }
      byDiv[divId].revenue += Number(m.metric_value)
    }
    const divMap = Object.fromEntries(divisions.map(d => [d.id, d.name]))
    return Object.entries(byDiv)
      .map(([id, data]) => ({ id, name: divMap[id] || 'System', ...data, profit: data.revenue - data.cost }))
      .sort((a, b) => b.cost - a.cost)
  }, [filtered, dailyMetrics, divisions])

  // ── Cost by caller ──
  const costByCaller = useMemo(() => {
    const byCaller: Record<string, { cost: number; calls: number }> = {}
    for (const r of filtered) {
      if (!byCaller[r.caller]) byCaller[r.caller] = { cost: 0, calls: 0 }
      byCaller[r.caller].cost += Number(r.cost_usd)
      byCaller[r.caller].calls++
    }
    return Object.entries(byCaller)
      .map(([caller, data]) => ({ caller, ...data }))
      .sort((a, b) => b.cost - a.cost)
  }, [filtered])

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CircleDollarSign className="w-6 h-6 text-[var(--accent-blue)]" />
          <div>
            <h2 className="text-2xl font-bold">Finance</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-0.5">Cost / Revenue / P&L Analysis (USD)</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--text-muted)]" />
          <select
            value={selectedDivision}
            onChange={e => setSelectedDivision(e.target.value)}
            className="text-xs font-[family-name:var(--font-mono)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5"
          >
            <option value="all">All Divisions</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div className="flex bg-[var(--bg-secondary)] border border-[var(--border)] rounded overflow-hidden">
            {[7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setPeriodDays(d)}
                className={`px-3 py-1.5 text-[10px] font-[family-name:var(--font-mono)] uppercase transition-colors ${
                  periodDays === d
                    ? 'bg-[var(--accent-blue)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={<TrendingDown className="w-4 h-4" />}
          label="Today Cost"
          value={formatUSD(todayTotalCost)}
          color="red"
        />
        <KpiCard
          icon={<CircleDollarSign className="w-4 h-4" />}
          label={`${periodDays}D Cost`}
          value={formatUSD(kpis.totalCost)}
          color="red"
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4" />}
          label={`${periodDays}D Revenue`}
          value={formatUSD(kpis.totalRevenue)}
          color="green"
        />
        <KpiCard
          icon={<BarChart3 className="w-4 h-4" />}
          label={`${periodDays}D Profit`}
          value={formatUSD(kpis.profit)}
          color={kpis.profit >= 0 ? 'green' : 'red'}
        />
        <KpiCard
          icon={<Cpu className="w-4 h-4" />}
          label="API Calls"
          value={kpis.totalCalls.toLocaleString()}
        />
        <KpiCard
          icon={<Clock className="w-4 h-4" />}
          label="Avg Latency"
          value={kpis.avgLatency > 0 ? `${(kpis.avgLatency / 1000).toFixed(1)}s` : '-'}
        />
      </div>

      {/* Charts Row 1: Cost Trend + Model Breakdown */}
      <div className="grid grid-cols-12 gap-4">
        {/* Daily Cost/Revenue Trend */}
        <div className="col-span-8 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader icon={<BarChart3 size={12} />} title="Daily Cost & Revenue Trend" />
          </div>
          {dailyCostTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dailyCostTrend}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} stroke="var(--text-muted)" />
                <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} stroke="var(--text-muted)" tickFormatter={v => formatUSD(v)} />
                <Tooltip
                  contentStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', borderRadius: 8, border: '1px solid var(--border)' }}
                  formatter={(value) => formatUSD(Number(value))}
                />
                <Area type="monotone" dataKey="cost" stroke="#EF4444" fill="url(#costGrad)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="url(#revGrad)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="비용 데이터가 아직 없습니다" />
          )}
        </div>

        {/* Cost by Model (Pie) */}
        <div className="col-span-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
          <SectionHeader icon={<Cpu size={12} />} title="Cost by Model" />
          {costByModel.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={costByModel}
                    dataKey="cost"
                    nameKey="model"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {costByModel.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', borderRadius: 8, border: '1px solid var(--border)' }}
                    formatter={(value) => formatUSD(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {costByModel.map((m, i) => (
                  <div key={m.model} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-[family-name:var(--font-mono)] text-[var(--text-secondary)]">{m.model}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--text-muted)] text-[10px]">{m.calls}calls</span>
                      <span className="font-[family-name:var(--font-mono)] font-medium">{formatUSD(m.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState message="모델별 데이터 없음" />
          )}
        </div>
      </div>

      {/* Charts Row 2: Division P&L + Caller Breakdown */}
      <div className="grid grid-cols-12 gap-4">
        {/* Division P&L */}
        <div className="col-span-8 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
          <SectionHeader icon={<Building2 size={12} />} title="Division P&L" />
          {costByDivision.length > 0 ? (
            <div className="mt-3">
              <div className="grid grid-cols-5 gap-2 text-[10px] font-[family-name:var(--font-mono)] uppercase text-[var(--text-muted)] mb-2 px-1">
                <span className="col-span-1">Division</span>
                <span className="text-right">Cost</span>
                <span className="text-right">Revenue</span>
                <span className="text-right">Profit</span>
                <span className="text-right">Calls</span>
              </div>
              {costByDivision.map(d => (
                <div
                  key={d.id}
                  className="grid grid-cols-5 gap-2 text-sm py-2.5 px-1 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-tertiary)] transition-colors rounded"
                >
                  <span className="col-span-1 font-medium truncate">{d.name}</span>
                  <span className="text-right font-[family-name:var(--font-mono)] text-[var(--accent-red)]">
                    {formatUSD(d.cost)}
                  </span>
                  <span className="text-right font-[family-name:var(--font-mono)] text-[var(--accent-green)]">
                    {formatUSD(d.revenue)}
                  </span>
                  <span className={`text-right font-[family-name:var(--font-mono)] font-medium flex items-center justify-end gap-1 ${
                    d.profit >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                  }`}>
                    {d.profit >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {formatUSD(Math.abs(d.profit))}
                  </span>
                  <span className="text-right font-[family-name:var(--font-mono)] text-[var(--text-secondary)]">
                    {d.calls.toLocaleString()}
                  </span>
                </div>
              ))}
              {/* Total row */}
              <div className="grid grid-cols-5 gap-2 text-sm py-2.5 px-1 mt-1 border-t-2 border-[var(--text-primary)] font-bold">
                <span className="col-span-1">Total</span>
                <span className="text-right font-[family-name:var(--font-mono)] text-[var(--accent-red)]">
                  {formatUSD(costByDivision.reduce((s, d) => s + d.cost, 0))}
                </span>
                <span className="text-right font-[family-name:var(--font-mono)] text-[var(--accent-green)]">
                  {formatUSD(costByDivision.reduce((s, d) => s + d.revenue, 0))}
                </span>
                <span className={`text-right font-[family-name:var(--font-mono)] ${
                  kpis.profit >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                }`}>
                  {formatUSD(Math.abs(kpis.profit))}
                </span>
                <span className="text-right font-[family-name:var(--font-mono)]">
                  {kpis.totalCalls.toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <EmptyState message="Division별 데이터 없음" />
          )}
        </div>

        {/* Cost by Caller */}
        <div className="col-span-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
          <SectionHeader icon={<Zap size={12} />} title="Cost by Caller" />
          {costByCaller.length > 0 ? (
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={costByCaller} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} stroke="var(--text-muted)" tickFormatter={v => formatUSD(v)} />
                  <YAxis type="category" dataKey="caller" tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} stroke="var(--text-muted)" width={70} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', borderRadius: 8, border: '1px solid var(--border)' }}
                    formatter={(value) => formatUSD(Number(value))}
                  />
                  <Bar dataKey="cost" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {costByCaller.map(c => (
                  <div key={c.caller} className="flex items-center justify-between text-xs">
                    <span className="font-[family-name:var(--font-mono)] text-[var(--text-secondary)] uppercase">{c.caller}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--text-muted)] text-[10px]">{c.calls} calls</span>
                      <span className="font-[family-name:var(--font-mono)] font-medium">{formatUSD(c.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="Caller별 데이터 없음" />
          )}
        </div>
      </div>

      {/* Recent LLM Usage Log */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
        <SectionHeader icon={<Bot size={12} />} title="Recent LLM Calls" />
        {filtered.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] font-[family-name:var(--font-mono)] uppercase text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="text-left py-2 px-1">Time</th>
                  <th className="text-left py-2 px-1">Model</th>
                  <th className="text-left py-2 px-1">Caller</th>
                  <th className="text-right py-2 px-1">Input</th>
                  <th className="text-right py-2 px-1">Output</th>
                  <th className="text-right py-2 px-1">Cost</th>
                  <th className="text-right py-2 px-1">Latency</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map(r => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-tertiary)] transition-colors">
                    <td className="py-2 px-1 font-[family-name:var(--font-mono)] text-[var(--text-muted)]">
                      {new Date(r.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2 px-1">
                      <span className="px-1.5 py-0.5 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] rounded text-[10px] font-[family-name:var(--font-mono)]">
                        {r.model}
                      </span>
                    </td>
                    <td className="py-2 px-1 font-[family-name:var(--font-mono)] text-[var(--text-secondary)] uppercase">{r.caller}</td>
                    <td className="py-2 px-1 text-right font-[family-name:var(--font-mono)]">{formatTokens(r.input_tokens)}</td>
                    <td className="py-2 px-1 text-right font-[family-name:var(--font-mono)]">{formatTokens(r.output_tokens)}</td>
                    <td className="py-2 px-1 text-right font-[family-name:var(--font-mono)] font-medium">{formatUSD(Number(r.cost_usd))}</td>
                    <td className="py-2 px-1 text-right font-[family-name:var(--font-mono)] text-[var(--text-muted)]">
                      {r.latency_ms ? `${(r.latency_ms / 1000).toFixed(1)}s` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 50 && (
              <p className="text-center text-[10px] text-[var(--text-muted)] mt-2 font-[family-name:var(--font-mono)]">
                Showing 50 of {filtered.length} records
              </p>
            )}
          </div>
        ) : (
          <EmptyState message="LLM 호출 기록이 없습니다. API 호출이 발생하면 여기에 표시됩니다." />
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────
// Sub-components
// ──────────────────────────────────────
function KpiCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color?: 'green' | 'red'
}) {
  const valueColor = color === 'red'
    ? 'text-[var(--accent-red)]'
    : color === 'green'
      ? 'text-[var(--accent-green)]'
      : 'text-[var(--text-primary)]'
  const iconColor = color === 'red'
    ? 'text-[var(--accent-red)]'
    : color === 'green'
      ? 'text-[var(--accent-green)]'
      : 'text-[var(--text-muted)]'

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
      <div className={`flex items-center gap-1.5 mb-2 ${iconColor}`}>
        {icon}
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-[family-name:var(--font-mono)]">{label}</span>
      </div>
      <span className={`text-xl font-bold font-[family-name:var(--font-mono)] ${valueColor}`}>
        {value}
      </span>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
      {icon}
      <span className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider">{title}</span>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center">
      <CircleDollarSign className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
    </div>
  )
}
