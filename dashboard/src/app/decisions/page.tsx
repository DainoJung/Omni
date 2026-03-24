import { createClient } from '@/lib/supabase/server'
import { DecisionAction } from '@/components/decision-action'
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react'

interface Decision {
  id: string
  title: string
  description: string
  priority: string
  status: string
  options: { label: string; description: string; recommended?: boolean }[]
  recommendation: number | null
  created_at: string
  divisions: { name: string } | null
}

export default async function DecisionsPage() {
  const supabase = await createClient()

  const { data: decisions } = await supabase
    .from('critical_decisions')
    .select('*, divisions(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  const pending = decisions?.filter((d: Decision) => d.status === 'pending') ?? []
  const resolved = decisions?.filter((d: Decision) => d.status !== 'pending') ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 text-[var(--accent-yellow)]" />
        <div>
          <h2 className="text-2xl font-bold">Critical Decisions</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Human-on-the-Loop 승인 큐
          </p>
        </div>
      </header>

      {pending.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-[var(--accent-yellow)] uppercase tracking-wider mb-3">
            Pending ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((d: Decision) => (
              <DecisionCard key={d.id} decision={d} />
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && (
        <div className="p-8 text-center bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
          <CheckCircle2 className="w-8 h-8 text-[var(--accent-green)] mx-auto mb-2" />
          <p className="text-[var(--accent-green)]">모든 결정이 처리되었습니다</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">대기 중인 승인 요청이 없습니다</p>
        </div>
      )}

      {resolved.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            History
          </h3>
          <div className="space-y-2">
            {resolved.map((d: Decision) => (
              <div
                key={d.id}
                className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg flex items-center justify-between text-sm"
              >
                <span>{d.title}</span>
                <span className={`flex items-center gap-1.5 text-xs uppercase ${d.status === 'approved' ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                  {d.status === 'approved' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function DecisionCard({ decision }: { decision: Decision }) {
  return (
    <div className="p-5 bg-[var(--bg-secondary)] border border-[var(--accent-yellow)]/30 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{decision.title}</h4>
        <span className="text-xs text-[var(--text-muted)]">
          {decision.divisions?.name ?? 'System'}
        </span>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{decision.description}</p>
      {decision.options && decision.options.length > 0 && (
        <div className="pt-2">
          <DecisionAction
            decisionId={decision.id}
            options={decision.options}
            recommendation={decision.recommendation}
          />
        </div>
      )}
    </div>
  )
}
