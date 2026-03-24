import { createClient } from '@/lib/supabase/server'
import { TrendingUp } from 'lucide-react'

interface Division {
  id: string
  name: string
  slug: string
  status: string
}

interface Metric {
  division_id: string
  metric_name: string
  metric_value: number
  period: string
  period_start: string
}

export default async function StrategyPage() {
  const supabase = await createClient()

  const [
    { data: divisions },
    { data: metrics },
  ] = await Promise.all([
    supabase.from('divisions').select('*').in('status', ['operating', 'building']).order('created_at'),
    supabase.from('division_metrics').select('*').eq('period', 'monthly').order('period_start', { ascending: false }).limit(100),
  ])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-[var(--accent-blue)]" />
        <div>
          <h2 className="text-2xl font-bold">Strategy Layer</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            크로스 Division 분석 — Phase 2에서 활성화
          </p>
        </div>
      </header>

      {/* Division Overview */}
      <section>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
          Active Divisions
        </h3>
        {divisions && divisions.length >= 2 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {divisions.map((d: Division) => {
              const divMetrics = metrics?.filter((m: Metric) => m.division_id === d.id) ?? []
              return (
                <div
                  key={d.id}
                  className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg"
                >
                  <h4 className="font-medium mb-3">{d.name}</h4>
                  {divMetrics.length > 0 ? (
                    <div className="space-y-2">
                      {divMetrics.slice(0, 5).map((m: Metric) => (
                        <div key={`${m.metric_name}-${m.period_start}`} className="flex justify-between text-sm">
                          <span className="text-[var(--text-secondary)]">{m.metric_name}</span>
                          <span className="font-mono">{m.metric_value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">메트릭 데이터 없음</p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
            <TrendingUp className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Strategy Layer는 2개 이상의 Division이 필요합니다</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Phase 2에서 두 번째 Division 생성 후 크로스 분석이 시작됩니다
            </p>
          </div>
        )}
      </section>

      {/* Cross Analysis Placeholder */}
      <section>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
          Cross-Division Analysis
        </h3>
        <div className="p-6 bg-[var(--bg-secondary)] border border-dashed border-[var(--border)] rounded-lg text-center">
          <p className="text-[var(--text-muted)] text-sm">
            Division 간 시너지 분석, 새 Division 제안, 저성과 Division 종료 제안
          </p>
          <p className="text-[var(--text-muted)] text-xs mt-2">Phase 2+</p>
        </div>
      </section>
    </div>
  )
}
