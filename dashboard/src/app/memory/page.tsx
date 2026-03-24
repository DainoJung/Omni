import { createClient } from '@/lib/supabase/server'
import { Brain, Building2, AlertTriangle, BookOpen, Settings } from 'lucide-react'
import type { ReactNode } from 'react'

interface Memory {
  id: string
  category: string
  content: string
  tags: string[]
  confidence: number
  times_referenced: number
  division_id: string | null
  created_at: string
}

export default async function MemoryPage() {
  const supabase = await createClient()

  const { data: memories } = await supabase
    .from('memories')
    .select('*')
    .gt('confidence', 0.3)
    .order('confidence', { ascending: false })
    .limit(50)

  const categories = ['architecture', 'failure', 'domain', 'operations']

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Brain className="w-6 h-6 text-[var(--accent-purple)]" />
        <div>
          <h2 className="text-2xl font-bold">Institutional Memory</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            운영에서 배운 구조화된 지식
          </p>
        </div>
      </header>

      {categories.map(cat => {
        const catMemories = memories?.filter((m: Memory) => m.category === cat) ?? []
        if (catMemories.length === 0) return null

        return (
          <section key={cat}>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
              {categoryLabel(cat)}
              <span>({catMemories.length})</span>
            </h3>
            <div className="space-y-2">
              {catMemories.map((m: Memory) => (
                <div
                  key={m.id}
                  className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm flex-1">{m.content}</p>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">
                      {(m.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {m.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="text-xs text-[var(--text-muted)] ml-auto">
                      참조 {m.times_referenced}회
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {(!memories || memories.length === 0) && (
        <div className="p-8 text-center bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
          <p className="text-[var(--text-secondary)]">아직 저장된 기억이 없습니다</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Division 운영이 시작되면 교훈이 자동으로 축적됩니다
          </p>
        </div>
      )}
    </div>
  )
}

function categoryLabel(cat: string): ReactNode {
  const labels: Record<string, ReactNode> = {
    architecture: (
      <span className="flex items-center gap-1.5">
        <Building2 className="w-4 h-4" />
        Architecture
      </span>
    ),
    failure: (
      <span className="flex items-center gap-1.5">
        <AlertTriangle className="w-4 h-4 text-[var(--accent-yellow)]" />
        Failures
      </span>
    ),
    domain: (
      <span className="flex items-center gap-1.5">
        <BookOpen className="w-4 h-4" />
        Domain Knowledge
      </span>
    ),
    operations: (
      <span className="flex items-center gap-1.5">
        <Settings className="w-4 h-4" />
        Operations
      </span>
    ),
  }
  return labels[cat] ?? <span>{cat}</span>
}
