import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface AgentSpec {
  id: string
  name: string
  role: string
  model: string
  schedule: Record<string, unknown>
}

interface PipelineStep {
  fromAgentId: string
  toAgentId: string
  triggerType: string
  messageType: string
}

interface BuildRequest {
  name: string
  slug: string
  description: string
  proposalText: string
  designDoc: Record<string, unknown>
  agents: AgentSpec[]
  pipeline: PipelineStep[]
  workspacePath: string
}

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

export async function POST(request: NextRequest) {
  const body: BuildRequest = await request.json()
  const supabase = await getSupabase()
  const results: string[] = []

  try {
    // Step 1: Create Division in DB
    const { data: division, error: divError } = await supabase
      .from('divisions')
      .insert({
        name: body.name,
        slug: body.slug,
        description: body.description,
        status: 'building',
        proposal_text: body.proposalText,
        design_doc: body.designDoc,
      })
      .select('id')
      .single()

    if (divError) throw new Error(`Division insert failed: ${divError.message}`)
    results.push(`Division created: ${division.id}`)

    await supabase.from('agent_events').insert({
      division_id: division.id,
      event_type: 'build_progress',
      payload: { step: 1, stepName: 'Division DB 등록', status: 'completed', progress: 15 },
    })

    // Step 2: Register agents in DB + OpenClaw
    const agentIdMap: Record<string, string> = {}

    for (const agent of body.agents) {
      const { data: dbAgent, error: agentError } = await supabase
        .from('agents')
        .insert({
          division_id: division.id,
          openclaw_agent_id: agent.id,
          name: agent.name,
          role: agent.role,
          model: agent.model,
          status: 'inactive',
          schedule: agent.schedule,
        })
        .select('id')
        .single()

      if (agentError) throw new Error(`Agent insert failed: ${agentError.message}`)
      agentIdMap[agent.id] = dbAgent.id

      const workspaceDir = `${body.workspacePath}/${agent.id}`
      try {
        await execAsync(`mkdir -p "${workspaceDir}"`)
        await execAsync(
          `openclaw agents add "${agent.id}" --workspace "${workspaceDir}" --model "${agent.model}" --non-interactive`
        )
        results.push(`Agent registered: ${agent.id}`)
      } catch (err) {
        results.push(`Agent warning: ${agent.id}: ${String(err)}`)
      }
    }

    await supabase.from('agent_events').insert({
      division_id: division.id,
      event_type: 'build_progress',
      payload: { step: 2, stepName: '에이전트 등록', status: 'completed', detail: `${body.agents.length}개`, progress: 50 },
    })

    // Step 3: Create pipeline
    for (const step of body.pipeline) {
      await supabase.from('division_pipelines').insert({
        division_id: division.id,
        from_agent_id: agentIdMap[step.fromAgentId],
        to_agent_id: agentIdMap[step.toAgentId],
        trigger_type: step.triggerType,
        message_type: step.messageType,
      })
    }

    await supabase.from('agent_events').insert({
      division_id: division.id,
      event_type: 'build_progress',
      payload: { step: 3, stepName: '파이프라인 구성', status: 'completed', progress: 70 },
    })

    // Step 4: Update agentToAgent allow list
    try {
      const agentIds = body.agents.map(a => a.id)
      const { stdout } = await execAsync(`cat ~/.openclaw/openclaw.json`)
      const config = JSON.parse(stdout)
      const currentAllow: string[] = config?.tools?.agentToAgent?.allow || []
      const newAllow = [...new Set([...currentAllow, ...agentIds])]

      if (newAllow.length > currentAllow.length) {
        await execAsync(`openclaw config set tools.agentToAgent.allow '${JSON.stringify(newAllow)}' --strict-json`)
        results.push('agentToAgent updated')
      }
    } catch (err) {
      results.push(`agentToAgent warning: ${String(err)}`)
    }

    // Step 5: Gateway restart
    try {
      await execAsync('openclaw gateway restart')
      results.push('Gateway restarted')
    } catch (err) {
      results.push(`Gateway warning: ${String(err)}`)
    }

    await supabase.from('agent_events').insert({
      division_id: division.id,
      event_type: 'build_progress',
      payload: { step: 4, stepName: 'Gateway 재시작', status: 'completed', progress: 85 },
    })

    // Step 6: Activate
    await supabase
      .from('divisions')
      .update({ status: 'operating', updated_at: new Date().toISOString() })
      .eq('id', division.id)

    await supabase
      .from('agents')
      .update({ status: 'active', last_active_at: new Date().toISOString() })
      .eq('division_id', division.id)

    await supabase.from('agent_events').insert({
      division_id: division.id,
      event_type: 'build_progress',
      payload: { step: 5, stepName: 'Division 활성화', status: 'completed', progress: 100 },
    })

    return NextResponse.json({ success: true, divisionId: division.id, results })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err), results }, { status: 500 })
  }
}
