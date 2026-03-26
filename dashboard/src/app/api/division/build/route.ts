import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const execAsync = promisify(exec)

interface AgentSpec {
  id: string
  name: string
  role: string
  model: string
  schedule: Record<string, unknown>
  skills?: string[]
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

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

/** 에이전트별 AGENTS.md 생성 */
function generateAgentsMd(agent: AgentSpec, divisionName: string, pipelineContext: string): string {
  return `# ${agent.name}

## 역할
${agent.role}

## Division
${divisionName}

## 모델
${agent.model}

## 규칙
1. 모든 응답은 JSON 형식으로만 출력한다
2. type + payload 필드를 반드시 포함한다
3. 에러 발생 시 type: "error", payload: { message, code }로 응답한다

## 파이프라인 컨텍스트
${pipelineContext}

## 응답 포맷
\`\`\`json
{
  "type": "결과_타입",
  "payload": { ... },
  "metadata": {
    "agentId": "${agent.id}",
    "timestamp": "ISO8601"
  }
}
\`\`\`

## 사용 가능한 도구
- exec: 시스템 명령 실행
- sessions_send: 다른 에이전트에게 메시지 전달
- web_search: 웹 검색
`
}

/** 스킬 설치 시도 (ClawHub 또는 워크스페이스) */
async function installSkills(agentId: string, skills: string[], workspaceDir: string): Promise<string[]> {
  const results: string[] = []

  for (const skill of skills) {
    try {
      // ClawHub에서 설치 시도
      await execAsync(`openclaw skills install "${skill}" --agent "${agentId}" --non-interactive`, { timeout: 30_000 })
      results.push(`Skill installed (clawhub): ${skill}`)
    } catch {
      // ClawHub에 없으면 워크스페이스 스킬 디렉토리 생성
      try {
        const skillDir = join(workspaceDir, 'skills', skill)
        await mkdir(skillDir, { recursive: true })
        await writeFile(join(skillDir, 'SKILL.md'), `# ${skill}\n\n## 설명\n자동 생성된 워크스페이스 스킬입니다. 구현이 필요합니다.\n\n## TODO\n- [ ] 스킬 로직 구현\n`)
        results.push(`Skill scaffold created (workspace): ${skill}`)
      } catch (err) {
        results.push(`Skill warning: ${skill}: ${String(err)}`)
      }
    }
  }

  return results
}

/** 스모크 테스트 — 에이전트가 응답하는지 확인 */
async function smokeTest(agentId: string): Promise<{ passed: boolean; detail: string }> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || ''

  try {
    const response = await fetch(`${gatewayUrl}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        model: `openclaw:${agentId}`,
        input: 'Health check: 네가 누구이고 무슨 역할인지 JSON으로 간단히 응답해.',
        stream: false,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      return { passed: false, detail: `Gateway ${response.status}` }
    }

    const data = await response.json()
    const hasOutput = data.output && data.output.length > 0
    return { passed: hasOutput, detail: hasOutput ? 'Agent responded' : 'Empty response' }
  } catch (err) {
    return { passed: false, detail: String(err) }
  }
}

export async function POST(request: NextRequest) {
  const body: BuildRequest = await request.json()
  const supabase = getSupabase()
  const results: string[] = []

  // approve 경로에서 호출되면 기존 division을 업데이트, 아니면 새로 생성
  let divisionId: string

  try {
    // ──────────────────────────────────────
    // Step 1: Division DB 등록 (또는 기존 division 사용)
    // ──────────────────────────────────────
    const { data: existing } = await supabase
      .from('divisions')
      .select('id')
      .eq('slug', body.slug)
      .eq('status', 'building')
      .single()

    if (existing) {
      divisionId = existing.id
      results.push(`Division exists (building): ${divisionId}`)
    } else {
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
      divisionId = division.id
      results.push(`Division created: ${divisionId}`)
    }

    await supabase.from('agent_events').insert({
      division_id: divisionId,
      event_type: 'build_progress',
      payload: { step: 1, stepName: 'Division DB 등록', status: 'completed', progress: 10 },
    })

    // ──────────────────────────────────────
    // Step 2: 에이전트 등록 (DB + OpenClaw + AGENTS.md)
    // ──────────────────────────────────────
    const agentIdMap: Record<string, string> = {}

    for (const agent of body.agents) {
      const { data: dbAgent, error: agentError } = await supabase
        .from('agents')
        .insert({
          division_id: divisionId,
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

      // 디렉토리 생성
      try {
        await mkdir(workspaceDir, { recursive: true })
      } catch { /* exists */ }

      // AGENTS.md 생성
      const pipelineContext = body.pipeline
        .filter(p => p.fromAgentId === agent.id || p.toAgentId === agent.id)
        .map(p => {
          if (p.fromAgentId === agent.id) return `나 → ${p.toAgentId} (${p.messageType})`
          return `${p.fromAgentId} → 나 (${p.messageType})`
        })
        .join('\n')

      try {
        await writeFile(
          join(workspaceDir, 'AGENTS.md'),
          generateAgentsMd(agent, body.name, pipelineContext || '독립 실행')
        )
        results.push(`AGENTS.md created: ${agent.id}`)
      } catch (err) {
        results.push(`AGENTS.md warning: ${agent.id}: ${String(err)}`)
      }

      // OpenClaw 에이전트 등록
      try {
        await execAsync(
          `openclaw agents add "${agent.id}" --workspace "${workspaceDir}" --model "${agent.model}" --non-interactive`,
          { timeout: 15_000 }
        )
        results.push(`Agent registered: ${agent.id}`)
      } catch (err) {
        results.push(`Agent register warning: ${agent.id}: ${String(err)}`)
      }

      // agent_skills 기록
      if (agent.skills && agent.skills.length > 0) {
        for (const skill of agent.skills) {
          const { error: skillErr } = await supabase.from('agent_skills').insert({
            agent_id: dbAgent.id,
            skill_name: skill,
            source: 'pending',
          })
          if (skillErr) results.push(`Skill record warning: ${skill}: ${skillErr.message}`)
        }
      }
    }

    await supabase.from('agent_events').insert({
      division_id: divisionId,
      event_type: 'build_progress',
      payload: { step: 2, stepName: '에이전트 등록 + AGENTS.md', status: 'completed', detail: `${body.agents.length}개`, progress: 35 },
    })

    // ──────────────────────────────────────
    // Step 3: 스킬 설치
    // ──────────────────────────────────────
    for (const agent of body.agents) {
      if (agent.skills && agent.skills.length > 0) {
        const workspaceDir = `${body.workspacePath}/${agent.id}`
        const skillResults = await installSkills(agent.id, agent.skills, workspaceDir)
        results.push(...skillResults)

        // agent_skills source 업데이트
        const dbAgentId = agentIdMap[agent.id]
        for (const sr of skillResults) {
          const skillName = sr.match(/: (.+)$/)?.[1]
          const source = sr.includes('clawhub') ? 'clawhub' : sr.includes('workspace') ? 'workspace' : 'unknown'
          if (skillName && dbAgentId) {
            await supabase.from('agent_skills')
              .update({ source })
              .eq('agent_id', dbAgentId)
              .eq('skill_name', skillName)
          }
        }
      }
    }

    await supabase.from('agent_events').insert({
      division_id: divisionId,
      event_type: 'build_progress',
      payload: { step: 3, stepName: '스킬 설치', status: 'completed', progress: 50 },
    })

    // ──────────────────────────────────────
    // Step 4: 파이프라인 구성
    // ──────────────────────────────────────
    for (const step of body.pipeline) {
      const fromId = agentIdMap[step.fromAgentId]
      const toId = agentIdMap[step.toAgentId]
      if (fromId && toId) {
        await supabase.from('division_pipelines').insert({
          division_id: divisionId,
          from_agent_id: fromId,
          to_agent_id: toId,
          trigger_type: step.triggerType,
          message_type: step.messageType,
        })
      }
    }

    await supabase.from('agent_events').insert({
      division_id: divisionId,
      event_type: 'build_progress',
      payload: { step: 4, stepName: '파이프라인 구성', status: 'completed', progress: 65 },
    })

    // ──────────────────────────────────────
    // Step 5: agentToAgent allow list 업데이트
    // ──────────────────────────────────────
    try {
      const agentIds = body.agents.map(a => a.id)
      const { stdout } = await execAsync(`cat ~/.openclaw/openclaw.json`, { timeout: 5_000 })
      const config = JSON.parse(stdout)
      const currentAllow: string[] = config?.tools?.agentToAgent?.allow || []
      const newAllow = [...new Set([...currentAllow, ...agentIds])]

      if (newAllow.length > currentAllow.length) {
        await execAsync(`openclaw config set tools.agentToAgent.allow '${JSON.stringify(newAllow)}' --strict-json`, { timeout: 5_000 })
        results.push('agentToAgent allow list updated')
      }
    } catch (err) {
      results.push(`agentToAgent warning: ${String(err)}`)
    }

    // ──────────────────────────────────────
    // Step 6: Gateway 재시작
    // ──────────────────────────────────────
    try {
      await execAsync('openclaw gateway restart', { timeout: 15_000 })
      results.push('Gateway restarted')
    } catch (err) {
      results.push(`Gateway warning: ${String(err)}`)
    }

    await supabase.from('agent_events').insert({
      division_id: divisionId,
      event_type: 'build_progress',
      payload: { step: 6, stepName: 'Gateway 재시작', status: 'completed', progress: 80 },
    })

    // ──────────────────────────────────────
    // Step 7: 스모크 테스트
    // ──────────────────────────────────────
    const smokeResults: Record<string, { passed: boolean; detail: string }> = {}
    let allPassed = true

    for (const agent of body.agents) {
      const result = await smokeTest(agent.id)
      smokeResults[agent.id] = result
      if (!result.passed) allPassed = false
      results.push(`Smoke test ${agent.id}: ${result.passed ? 'PASS' : 'FAIL'} (${result.detail})`)
    }

    await supabase.from('agent_events').insert({
      division_id: divisionId,
      event_type: 'build_progress',
      payload: {
        step: 7,
        stepName: '스모크 테스트',
        status: allPassed ? 'completed' : 'warning',
        detail: `${Object.values(smokeResults).filter(r => r.passed).length}/${body.agents.length} passed`,
        smokeResults,
        progress: 95,
      },
    })

    // ──────────────────────────────────────
    // Step 8: 활성화
    // ──────────────────────────────────────
    await supabase
      .from('divisions')
      .update({ status: 'operating', updated_at: new Date().toISOString() })
      .eq('id', divisionId)

    await supabase
      .from('agents')
      .update({ status: 'active', last_active_at: new Date().toISOString() })
      .eq('division_id', divisionId)

    await supabase.from('agent_events').insert({
      division_id: divisionId,
      event_type: 'build_progress',
      payload: { step: 8, stepName: 'Division 활성화', status: 'completed', progress: 100 },
    })

    // 빌드 완료 메모리 저장
    try {
      const memoryUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'}/api/memory`
      await fetch(memoryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          divisionId,
          category: 'operations',
          content: `Division "${body.name}" 구축 완료. 에이전트 ${body.agents.length}개, 파이프라인 ${body.pipeline.length}단계. 스모크 테스트: ${allPassed ? '전체 통과' : '일부 실패'}.`,
          tags: ['build', 'division', body.slug],
          confidence: 0.8,
          source: 'division-builder',
        }),
      })
    } catch { /* memory save is best-effort */ }

    return NextResponse.json({
      success: true,
      divisionId,
      results,
      smokeTest: { allPassed, details: smokeResults },
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err), results }, { status: 500 })
  }
}
