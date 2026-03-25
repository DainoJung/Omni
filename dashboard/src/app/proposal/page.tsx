import { MessageSquare, ArrowRight } from 'lucide-react'

export default function ProposalPage() {
  return (
    <div className="max-w-lg mx-auto py-16 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-[var(--accent-blue)]/10 flex items-center justify-center mx-auto">
        <MessageSquare className="w-8 h-8 text-[var(--accent-blue)]" />
      </div>

      <div>
        <h2 className="text-2xl font-bold">Division 생성</h2>
        <p className="text-[var(--text-secondary)] text-sm mt-2 leading-relaxed">
          우측 컨트롤타워 챗봇에서 자유롭게 대화하며<br />
          새로운 Division을 만들 수 있습니다.
        </p>
      </div>

      <div className="space-y-3 text-left max-w-sm mx-auto">
        <ExampleMessage text="유튜브 채널 사업을 해보고 싶어" />
        <ExampleMessage text="온라인 교육 플랫폼 만들어볼까" />
        <ExampleMessage text="커머스 자동화 사업 시작하려고 하는데" />
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        챗봇이 역량 분석, 에이전트 구성, 파이프라인 설계를 자동으로 진행합니다.
      </p>
    </div>
  )
}

function ExampleMessage({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)]">
      <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
      <span>&quot;{text}&quot;</span>
    </div>
  )
}
