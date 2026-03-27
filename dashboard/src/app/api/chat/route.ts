import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { recordLLMUsage } from '@/lib/cost-tracker'

// ── Supabase ──
function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

// ── System Prompt ──
const SYSTEM_PROMPT = `You are Omni, an Agent OS for Autonomous Business.
You are the Control Tower — the central command interface.

## Your Role
- Monitor and manage all Divisions (business units), Agents, and operations
- Answer questions about system status, performance, and strategy
- Execute commands: create divisions, approve decisions, search memory, run agents
- When a task requires an actual agent to execute (pipeline run, content creation, research), call the run_agent tool
- When you need real-time information from the web (news, market data, trends, competitor info), use the web_search tool
- Include source citations when presenting web search results

## How to Think
For every task, follow this reasoning pattern — skip steps that aren't needed:

1. **Clarify** — If the request is ambiguous, ask 1-3 targeted questions. Don't ask obvious things. If clear enough, skip.
2. **Research** — Gather information before acting. Use web_search for external data, search_memory for internal knowledge, get_system_status/get_divisions/get_agents for system state. Save key findings with save_memory.
3. **Plan** — Organize gathered information into a clear direction. Present your analysis and plan to the user before executing irreversible actions.
4. **Execute** — Carry out the task using appropriate tools. One step at a time, observe results before proceeding.
5. **Document** — Save important decisions, research findings, and lessons using save_memory for future reference.

Simple questions → answer directly (skip all steps).
Complex tasks → follow the full pattern.
The key is judgment: match depth of reasoning to complexity of the task.

## Division Creation
When creating a new Division:
- Clarify target audience, revenue model, budget if not specified
- Research market, competitors, available tools via web_search
- Call create_proposal with enriched context
- Present the design summary to user for feedback
- On user approval, call approve_proposal to trigger build

## Response Format
When executing multi-step operations, use these markers to show progress:
[PLAN:step description] — marks a new phase
[TOOL:action name] — tool/system action
[FILE:filename] — file creation
[API:endpoint] — API call
[SEARCH:query] — search operation
[DB:query description] — database query
> detail line — expandable detail (prefix with >)
[DONE] — marks completion

Use markdown for final responses (tables, lists, bold, code blocks).
Answer in the same language the user writes in.`

// ── Tool Definitions ──
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_system_status',
      description: 'Get full system status: divisions, agents, pending decisions, costs, recent events',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_divisions',
      description: 'Get all divisions with their agents and status',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status: operating, building, designing, paused, sunset', enum: ['operating', 'building', 'designing', 'paused', 'sunset'] },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_agents',
      description: 'Get all agents with status, model, division, error count',
      parameters: {
        type: 'object',
        properties: {
          division_id: { type: 'string', description: 'Filter by division ID' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_decisions',
      description: 'Get critical decisions requiring human approval',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'all'], default: 'pending' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'resolve_decision',
      description: 'Approve or reject a critical decision',
      parameters: {
        type: 'object',
        properties: {
          decision_id: { type: 'string', description: 'Decision ID' },
          action: { type: 'string', enum: ['approved', 'rejected'] },
          decided_option: { type: 'string', description: 'The chosen option (for approval)' },
        },
        required: ['decision_id', 'action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_memory',
      description: 'Search institutional memory by keyword or category',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keyword' },
          category: { type: 'string', enum: ['operations', 'insights', 'lessons'] },
          division_id: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_metrics',
      description: 'Get division performance metrics (views, revenue, costs)',
      parameters: {
        type: 'object',
        properties: {
          division_id: { type: 'string', description: 'Division ID (omit for all)' },
          period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_events',
      description: 'Get recent agent events (tasks, errors, escalations)',
      parameters: {
        type: 'object',
        properties: {
          division_id: { type: 'string' },
          event_type: { type: 'string', enum: ['task_complete', 'task_error', 'escalation', 'build_progress'] },
          limit: { type: 'number', default: 20 },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_agent',
      description: 'Execute a task via OpenClaw agent. Use this when actual agent execution is needed (pipeline runs, content creation, research, etc.)',
      parameters: {
        type: 'object',
        properties: {
          agent_id: { type: 'string', description: 'Agent ID in openclaw.json (e.g. orchestrator, division-builder)' },
          message: { type: 'string', description: 'Task instruction for the agent' },
        },
        required: ['agent_id', 'message'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the web for real-time information. Use this for current events, market data, competitor info, trends, or any information not available in the system database.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          allowed_domains: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional: limit results to specific domains (e.g. ["reuters.com", "techcrunch.com"])',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'manage_division',
      description: 'Update division status (pause, resume, sunset)',
      parameters: {
        type: 'object',
        properties: {
          division_id: { type: 'string' },
          action: { type: 'string', enum: ['pause', 'resume', 'sunset'] },
        },
        required: ['division_id', 'action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_proposal',
      description: 'Design a new Division by submitting a business proposal to the Division Builder agent. Call this AFTER clarifying questions and research. Returns a structured design document.',
      parameters: {
        type: 'object',
        properties: {
          proposal: { type: 'string', description: 'Full business proposal with all gathered context (target market, revenue model, budget, research findings)' },
        },
        required: ['proposal'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'approve_proposal',
      description: 'Approve a Division design and trigger the build pipeline. Only call after user explicitly confirms the design.',
      parameters: {
        type: 'object',
        properties: {
          division_id: { type: 'string', description: 'Division ID from create_proposal result' },
        },
        required: ['division_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'save_memory',
      description: 'Save research findings, decisions, or lessons to institutional memory for future reference. Use during complex tasks to document important information.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'What to remember' },
          category: { type: 'string', enum: ['operations', 'insights', 'lessons'], description: 'Memory category' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags for searchability' },
          division_id: { type: 'string', description: 'Associate with a specific division (optional)' },
        },
        required: ['content', 'category', 'tags'],
      },
    },
  },
]

// ── Tool Executors ──
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const supabase = getSupabase()

  switch (name) {
    case 'get_system_status': {
      const today = new Date().toISOString().split('T')[0]
      const [{ data: divisions }, { data: agents }, { count: eventCount }, { data: pendingDecisions }, { data: costMetrics }] = await Promise.all([
        supabase.from('divisions').select('id, name, slug, status').order('created_at'),
        supabase.from('agents').select('id, name, status, model, division_id, error_count, last_active_at'),
        supabase.from('agent_events').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00Z`),
        supabase.from('critical_decisions').select('id, title, priority, status').eq('status', 'pending'),
        supabase.from('division_metrics').select('division_id, metric_name, metric_value').eq('metric_name', 'api_cost').eq('period', 'daily').eq('period_start', today),
      ])
      const totalCost = (costMetrics ?? []).reduce((sum, m) => sum + Number(m.metric_value), 0)
      return JSON.stringify({
        divisions: (divisions ?? []).map(d => ({
          ...d,
          agents: (agents ?? []).filter(a => a.division_id === d.id).map(a => ({ name: a.name, status: a.status, model: a.model, errors: a.error_count })),
        })),
        summary: {
          totalDivisions: divisions?.length ?? 0,
          operatingDivisions: divisions?.filter(d => d.status === 'operating').length ?? 0,
          totalAgents: agents?.length ?? 0,
          activeAgents: agents?.filter(a => a.status === 'active').length ?? 0,
          todayEvents: eventCount ?? 0,
          pendingDecisions: pendingDecisions?.length ?? 0,
          dailyCost: totalCost,
        },
        pendingDecisions: pendingDecisions ?? [],
      })
    }

    case 'get_divisions': {
      let q = supabase.from('divisions').select('id, name, slug, status, description, created_at')
      if (args.status) q = q.eq('status', args.status as string)
      const { data } = await q.order('created_at', { ascending: false })
      // Also get agent counts
      const { data: agents } = await supabase.from('agents').select('id, division_id, name, status')
      const result = (data ?? []).map(d => ({
        ...d,
        agent_count: (agents ?? []).filter(a => a.division_id === d.id).length,
        active_agents: (agents ?? []).filter(a => a.division_id === d.id && a.status === 'active').length,
      }))
      return JSON.stringify(result)
    }

    case 'get_agents': {
      let q = supabase.from('agents').select('id, division_id, name, role, model, status, last_active_at, error_count, schedule')
      if (args.division_id) q = q.eq('division_id', args.division_id as string)
      const { data } = await q.order('last_active_at', { ascending: false })
      return JSON.stringify(data ?? [])
    }

    case 'get_decisions': {
      let q = supabase.from('critical_decisions').select('id, division_id, agent_id, priority, title, description, options, recommendation, status, decided_option, expires_at, created_at')
      if (args.status && args.status !== 'all') q = q.eq('status', args.status as string)
      const { data } = await q.order('created_at', { ascending: false }).limit(20)
      return JSON.stringify(data ?? [])
    }

    case 'resolve_decision': {
      const { data, error } = await supabase
        .from('critical_decisions')
        .update({ status: args.action as string, decided_option: (args.decided_option as string) || null })
        .eq('id', args.decision_id as string)
        .select('id, title, status')
        .single()
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ success: true, decision: data })
    }

    case 'search_memory': {
      let q = supabase.from('memories').select('id, division_id, category, content, tags, confidence, times_referenced, created_at')
      if (args.category) q = q.eq('category', args.category as string)
      if (args.division_id) q = q.eq('division_id', args.division_id as string)
      if (args.query) q = q.ilike('content', `%${args.query}%`)
      const { data } = await q.order('confidence', { ascending: false }).limit(10)
      return JSON.stringify(data ?? [])
    }

    case 'get_metrics': {
      let q = supabase.from('division_metrics').select('division_id, metric_name, metric_value, period, period_start')
      if (args.division_id) q = q.eq('division_id', args.division_id as string)
      if (args.period) q = q.eq('period', args.period as string)
      const { data } = await q.order('period_start', { ascending: false }).limit(50)
      return JSON.stringify(data ?? [])
    }

    case 'get_events': {
      let q = supabase.from('agent_events').select('id, division_id, agent_id, event_type, payload, created_at')
      if (args.division_id) q = q.eq('division_id', args.division_id as string)
      if (args.event_type) q = q.eq('event_type', args.event_type as string)
      const limit = (args.limit as number) || 20
      const { data } = await q.order('created_at', { ascending: false }).limit(limit)
      return JSON.stringify(data ?? [])
    }

    case 'run_agent': {
      const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
      const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || ''
      try {
        const response = await fetch(`${gatewayUrl}/v1/responses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gatewayToken}` },
          body: JSON.stringify({ model: `openclaw:${args.agent_id}`, input: args.message }),
          signal: AbortSignal.timeout(120_000),
        })
        if (!response.ok) {
          return JSON.stringify({ error: `Agent call failed: ${response.status}`, detail: await response.text().catch(() => '') })
        }
        const data = await response.json()
        // Extract text from OpenResponses format
        let text = ''
        const output = data.output as Array<{ type: string; content?: Array<{ type: string; text?: string }> }> | undefined
        if (output) {
          for (const item of output) {
            if (item.type === 'message' && item.content) {
              for (const c of item.content) {
                if (c.type === 'output_text' && c.text) text += c.text
              }
            }
          }
        }
        return text || JSON.stringify(data)
      } catch (err) {
        return JSON.stringify({ error: 'Agent execution failed', detail: String(err) })
      }
    }

    case 'web_search': {
      const searchModel = process.env.OMNI_SEARCH_MODEL || 'gpt-4o-mini-search-preview'
      try {
        const searchBody: Record<string, unknown> = {
          model: searchModel,
          messages: [{ role: 'user', content: args.query as string }],
          web_search_options: {},
        }
        // Add domain filters if provided
        if (args.allowed_domains && Array.isArray(args.allowed_domains) && args.allowed_domains.length > 0) {
          searchBody.web_search_options = {
            search_context_size: 'medium',
            user_location: { type: 'approximate', country: 'KR' },
          }
        }
        const searchRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify(searchBody),
          signal: AbortSignal.timeout(30_000),
        })
        if (!searchRes.ok) {
          return JSON.stringify({ error: `Web search failed: ${searchRes.status}` })
        }
        const searchData = await searchRes.json()
        const searchChoice = searchData.choices?.[0]?.message

        // Track search cost
        if (searchData.usage) {
          recordLLMUsage({
            model: searchModel,
            usage: { input_tokens: searchData.usage.prompt_tokens, output_tokens: searchData.usage.completion_tokens },
            caller: 'chat',
            metadata: { tool: 'web_search', query: args.query },
          }).catch(() => {})
        }

        // Extract content and citations
        const content = searchChoice?.content || ''
        const annotations = searchChoice?.annotations || []
        const citations = annotations
          .filter((a: any) => a.type === 'url_citation')
          .map((a: any) => ({ title: a.url_citation?.title, url: a.url_citation?.url }))

        return JSON.stringify({ content, citations })
      } catch (err) {
        return JSON.stringify({ error: 'Web search failed', detail: String(err) })
      }
    }

    case 'manage_division': {
      const statusMap: Record<string, string> = { pause: 'paused', resume: 'operating', sunset: 'sunset' }
      const newStatus = statusMap[args.action as string]
      if (!newStatus) return JSON.stringify({ error: 'Invalid action' })
      const { data, error } = await supabase
        .from('divisions')
        .update({ status: newStatus })
        .eq('id', args.division_id as string)
        .select('id, name, status')
        .single()
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ success: true, division: data })
    }

    case 'create_proposal': {
      const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
      const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || ''
      try {
        // Call division-builder agent via OpenClaw
        const res = await fetch(`${gatewayUrl}/v1/responses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gatewayToken}` },
          body: JSON.stringify({ model: 'openclaw:division-builder', input: args.proposal as string }),
          signal: AbortSignal.timeout(180_000),
        })
        if (!res.ok) {
          return JSON.stringify({ error: `Division builder failed: ${res.status}` })
        }
        const data = await res.json()
        let text = ''
        const output = data.output as Array<{ type: string; content?: Array<{ type: string; text?: string }> }> | undefined
        if (output) {
          for (const item of output) {
            if (item.type === 'message' && item.content) {
              for (const c of item.content) {
                if (c.type === 'output_text' && c.text) text += c.text
              }
            }
          }
        }
        // Try to extract JSON design doc
        let designDoc = null
        const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
        if (jsonMatch) { try { designDoc = JSON.parse(jsonMatch[1].trim()) } catch {} }
        if (!designDoc) {
          const braceStart = text.indexOf('{')
          const braceEnd = text.lastIndexOf('}')
          if (braceStart !== -1 && braceEnd > braceStart) {
            try { designDoc = JSON.parse(text.slice(braceStart, braceEnd + 1)) } catch {}
          }
        }

        // Save to DB
        if (designDoc && designDoc.agents) {
          const { data: div, error } = await supabase.from('divisions').insert({
            name: designDoc.shortName || 'New Division',
            slug: (designDoc.shortName || 'new-div').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30),
            status: 'designing',
            description: designDoc.business?.description || '',
            proposal_text: args.proposal as string,
            design_doc: designDoc,
          }).select('id, name, slug, status').single()

          if (error) return JSON.stringify({ error: error.message })
          return JSON.stringify({ divisionId: div.id, name: div.name, slug: div.slug, designSummary: text.slice(0, 2000) })
        }
        return JSON.stringify({ rawResponse: text.slice(0, 2000), warning: 'Could not parse design document' })
      } catch (err) {
        return JSON.stringify({ error: 'Division builder failed', detail: String(err) })
      }
    }

    case 'approve_proposal': {
      const divId = args.division_id as string
      const { data: div, error: fetchErr } = await supabase.from('divisions').select('id, name, status, design_doc').eq('id', divId).single()
      if (fetchErr || !div) return JSON.stringify({ error: 'Division not found' })
      if (div.status !== 'designing') return JSON.stringify({ error: `Cannot approve: status is "${div.status}"` })

      // Update status to building
      await supabase.from('divisions').update({ status: 'building' }).eq('id', divId)

      // Fire-and-forget build
      const buildUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/division/build`
      fetch(buildUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: div.name,
          slug: div.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: (div.design_doc as any)?.business?.description || '',
          proposalText: '',
          designDoc: div.design_doc,
          agents: (div.design_doc as any)?.agents || [],
          pipeline: (div.design_doc as any)?.pipeline || [],
          executionScripts: (div.design_doc as any)?.executionScripts || [],
        }),
      }).catch(() => {})

      return JSON.stringify({ success: true, divisionId: divId, name: div.name, message: 'Build started in background' })
    }

    case 'save_memory': {
      // Generate embedding if possible
      let embedding: number[] | null = null
      const openaiKey = process.env.OPENAI_API_KEY
      if (openaiKey) {
        try {
          const embRes = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
            body: JSON.stringify({ model: 'text-embedding-3-small', input: args.content as string }),
          })
          if (embRes.ok) {
            const embData = await embRes.json()
            embedding = embData.data?.[0]?.embedding || null
          }
        } catch {}
      }

      const { data: mem, error: memErr } = await supabase.from('memories').insert({
        division_id: (args.division_id as string) || null,
        category: (args.category as string) || 'insights',
        content: args.content as string,
        tags: (args.tags as string[]) || [],
        confidence: 0.7,
        embedding: embedding ? `[${embedding.join(',')}]` : null,
      }).select('id').single()

      if (memErr) return JSON.stringify({ error: memErr.message })
      return JSON.stringify({ success: true, memoryId: mem.id })
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

// ── Streaming Helper ──
async function streamFinalResponse(apiKey: string, model: string, messages: any[], startTime: number) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, stream: true }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!response.ok || !response.body) {
    return new Response(JSON.stringify({ error: 'Streaming failed' }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
            try {
              const json = JSON.parse(line.slice(6))
              const delta = json.choices?.[0]?.delta?.content
              if (delta) {
                fullText += delta
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
              }
            } catch {}
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, reply: fullText })}\n\n`))
      } catch {} finally {
        controller.close()
        recordLLMUsage({ model, usage: { input_tokens: 0, output_tokens: Math.ceil(fullText.length / 4) }, caller: 'chat', latencyMs: Date.now() - startTime }).catch(() => {})
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}

// ── Main Handler ──
export async function POST(request: NextRequest) {
  const { message, history } = await request.json()
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OMNI_CHAT_MODEL || 'gpt-4.1-mini'
  const startTime = Date.now()

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Build messages array from history + new message
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
  ]

  // Append conversation history (last 20 turns max)
  if (Array.isArray(history)) {
    for (const h of history.slice(-20)) {
      messages.push({ role: h.role, content: h.content })
    }
  }

  messages.push({ role: 'user', content: message })

  try {
    // Tool use loop: call OpenAI, execute tools, feed results back (non-streaming)
    let loopCount = 0
    const maxLoops = 10

    while (loopCount < maxLoops) {
      loopCount++

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, tools: TOOLS, tool_choice: 'auto' }),
        signal: AbortSignal.timeout(60_000),
      })

      if (!response.ok) {
        const err = await response.text()
        return new Response(JSON.stringify({ error: `OpenAI error: ${response.status}`, detail: err }), {
          status: 502, headers: { 'Content-Type': 'application/json' },
        })
      }

      const data = await response.json()
      const choice = data.choices?.[0]
      const assistantMsg = choice?.message
      if (!assistantMsg) break

      // Track usage
      if (data.usage) {
        recordLLMUsage({
          model,
          usage: { input_tokens: data.usage.prompt_tokens, output_tokens: data.usage.completion_tokens },
          caller: 'chat', latencyMs: Date.now() - startTime,
        }).catch(() => {})
      }

      // No tool calls → stream the final response for fast display
      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        // Re-request with streaming enabled for the final response
        messages.push({ role: 'assistant', content: assistantMsg.content || '' })
        // But we already have the content, so just return it quickly
        // For truly long responses, use streaming. For short ones, return JSON.
        const reply = assistantMsg.content || ''
        if (reply.length > 500) {
          // Stream long responses
          return streamFinalResponse(apiKey, model, messages.slice(0, -1), startTime)
        }
        return new Response(JSON.stringify({ reply }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Execute tool calls in parallel
      messages.push(assistantMsg)
      const toolResults = await Promise.all(
        assistantMsg.tool_calls.map(async (tc: any) => {
          let toolArgs: Record<string, unknown> = {}
          try { toolArgs = JSON.parse(tc.function.arguments || '{}') } catch {}
          const result = await executeTool(tc.function.name, toolArgs)
          return { role: 'tool', content: result, tool_call_id: tc.id }
        })
      )
      for (const tr of toolResults) {
        messages.push(tr as any)
      }
    }

    // Fallback if loop exhausted
    return new Response(JSON.stringify({ reply: 'Processing complete.' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Chat processing failed', detail: String(err) }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })
  }
}
