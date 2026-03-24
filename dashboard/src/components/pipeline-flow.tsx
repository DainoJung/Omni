import { Bot, ArrowRight, ArrowDown } from 'lucide-react'

interface PipelineAgent {
  id: string
  name: string
  model: string
  status: string
}

interface PipelineConnection {
  from_agent: { name: string } | null
  to_agent: { name: string } | null
  message_type: string
}

interface PipelineFlowProps {
  agents: PipelineAgent[]
  pipelines: PipelineConnection[]
  direction?: 'horizontal' | 'vertical'
}

function getStatusStyles(status: string): { border: string; dot: string; shadow?: string } {
  switch (status) {
    case 'active':
      return {
        border: 'border-[var(--accent-green)]',
        dot: 'bg-[var(--accent-green)]',
        shadow: 'shadow-[0_0_8px_var(--accent-green)]',
      }
    case 'error':
      return {
        border: 'border-[var(--accent-red)]',
        dot: 'bg-[var(--accent-red)]',
        shadow: 'shadow-[0_0_8px_var(--accent-red)]',
      }
    default:
      return {
        border: 'border-[var(--border)]',
        dot: 'bg-[var(--text-muted)]',
      }
  }
}

function buildOrderedChain(
  agents: PipelineAgent[],
  pipelines: PipelineConnection[],
): { agent: PipelineAgent; connection: PipelineConnection | null }[] {
  if (agents.length === 0) return []

  // Build a map of agent name -> agent
  const agentByName = new Map<string, PipelineAgent>()
  for (const a of agents) {
    agentByName.set(a.name, a)
  }

  // Find agents that have incoming connections
  const hasIncoming = new Set<string>()
  for (const p of pipelines) {
    if (p.to_agent?.name) hasIncoming.add(p.to_agent.name)
  }

  // Find connection map: from_name -> connection
  const connectionFrom = new Map<string, PipelineConnection>()
  for (const p of pipelines) {
    if (p.from_agent?.name) connectionFrom.set(p.from_agent.name, p)
  }

  // Find first agent (no incoming connection)
  let firstAgent: PipelineAgent | undefined
  for (const a of agents) {
    if (!hasIncoming.has(a.name)) {
      firstAgent = a
      break
    }
  }

  // Fallback if no clear first agent
  if (!firstAgent) firstAgent = agents[0]

  const chain: { agent: PipelineAgent; connection: PipelineConnection | null }[] = []
  const visited = new Set<string>()
  let current: PipelineAgent | undefined = firstAgent

  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    const conn = connectionFrom.get(current.name) ?? null
    chain.push({ agent: current, connection: conn })

    if (conn?.to_agent?.name) {
      current = agentByName.get(conn.to_agent.name)
    } else {
      break
    }
  }

  // Append any agents not in the chain
  for (const a of agents) {
    if (!visited.has(a.id)) {
      chain.push({ agent: a, connection: null })
    }
  }

  return chain
}

export function PipelineFlow({ agents, pipelines, direction = 'horizontal' }: PipelineFlowProps) {
  if (agents.length === 0) {
    return (
      <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)]">
        에이전트 없음
      </div>
    )
  }

  const chain = buildOrderedChain(agents, pipelines)
  const isVertical = direction === 'vertical'

  return (
    <div className={`flex ${isVertical ? 'flex-col' : 'flex-row flex-wrap'} items-center gap-2`}>
      {chain.map(({ agent, connection }, index) => {
        const styles = getStatusStyles(agent.status)
        const isLast = index === chain.length - 1

        return (
          <div
            key={agent.id}
            className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-2`}
          >
            {/* Agent node */}
            <div
              className={`p-3 bg-[var(--bg-secondary)] border rounded-lg ${styles.border} ${styles.shadow ?? ''} min-w-[120px]`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <span className="font-medium text-sm truncate">{agent.name}</span>
                <span className={`ml-auto inline-block w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
              </div>
              <p className="text-xs text-[var(--text-muted)] truncate">{agent.model}</p>
            </div>

            {/* Arrow + label to next node */}
            {!isLast && connection && (
              <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-1`}>
                {isVertical ? (
                  <>
                    <p className="text-xs text-[var(--text-muted)] text-center">{connection.message_type}</p>
                    <ArrowDown className="w-4 h-4 text-[var(--text-muted)]" />
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                    <p className="text-xs text-[var(--text-muted)]">{connection.message_type}</p>
                  </>
                )}
              </div>
            )}

            {/* Arrow without connection for non-last agents */}
            {!isLast && !connection && (
              <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center`}>
                {isVertical ? (
                  <ArrowDown className="w-4 h-4 text-[var(--text-muted)]" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
