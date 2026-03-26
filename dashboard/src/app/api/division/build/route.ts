import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { extractUsageFromResponse, recordLLMUsage, resolveModelName } from '@/lib/cost-tracker'

const execAsync = promisify(exec)

interface AgentRequirement {
  type: string
  service: string
  env: string
  required?: boolean
  description?: string
  setupUrl?: string
}

interface AgentOutput {
  type: string
  format: string
  destination: string
  description?: string
}

interface AgentSpec {
  id: string
  name: string
  role: string
  model: string
  schedule: Record<string, unknown>
  skills?: string[]
  requirements?: AgentRequirement[]
  outputs?: AgentOutput[]
}

interface PipelineStep {
  fromAgentId: string
  toAgentId: string
  triggerType: string
  messageType: string
}

interface ExecutionScript {
  name: string
  language: string
  purpose: string
  agentId: string
  requirements: string[]
  inputFormat: string
  outputFormat: string
  externalService: string
  apiDocs?: string
}

interface BuildRequest {
  name: string
  slug: string
  description: string
  proposalText: string
  designDoc: Record<string, unknown>
  agents: AgentSpec[]
  pipeline: PipelineStep[]
  executionScripts?: ExecutionScript[]
  workspacePath: string
}

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

/** 에이전트별 AGENTS.md 생성 (실행형) */
function generateAgentsMd(agent: AgentSpec, divisionName: string, pipelineContext: string, scripts: ExecutionScript[]): string {
  const agentScripts = scripts.filter(s => s.agentId === agent.id || s.agentId === agent.id.split('_').pop())
  const hasScripts = agentScripts.length > 0

  const scriptsSection = hasScripts ? `
## 실행 스크립트 (핵심!)

이 에이전트는 아래 Python 스크립트로 **실제 작업을 실행**한다.
설명만 하지 말고, 반드시 스크립트를 실행해서 실제 결과물을 만들어야 한다.

${agentScripts.map(s => `### ${s.name}
- 목적: ${s.purpose}
- 외부 서비스: ${s.externalService}
- 실행: \`exec: python scripts/${s.name}.py '입력JSON'\`
- 입력: ${s.inputFormat}
- 출력: ${s.outputFormat}
`).join('\n')}

### 작업 방식
1. 이전 단계의 JSON 또는 사용자 요청을 받는다
2. 필요한 데이터를 정리해서 스크립트 입력 JSON을 만든다
3. \`exec: python scripts/{스크립트명}.py '{입력JSON}'\` 으로 실행한다
4. 스크립트 출력 결과를 확인하고, 다음 단계에 전달한다
5. 에러 발생 시 재시도하거나 에스컬레이션한다

**절대 하지 말 것:**
- 스크립트를 실행하지 않고 "이렇게 하면 됩니다"라고 설명만 하기
- 결과를 추측해서 가짜 JSON 만들기
- 스크립트 없이 API를 직접 호출하려 시도하기
` : `
## 작업 방식

이 에이전트는 LLM 자체 능력(분석, 검색, 추론)으로 작업을 수행한다.
web_search, 데이터 분석, 텍스트 생성 등을 활용한다.
`

  return `# ${agent.name}

## 역할
${agent.role}

## Division
${divisionName}

## 모델
${agent.model}

## 파이프라인 컨텍스트
${pipelineContext}
${scriptsSection}
## 응답 포맷
모든 응답은 반드시 JSON으로만 출력한다. 자연어 설명, 인사말, 코드블록 감싸기 금지.

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

에러 발생 시: \`{"type":"error","payload":{"message":"에러 내용","code":"ERROR_CODE"}}\`

## 사용 가능한 도구
- **exec**: 시스템 명령 실행 — Python 스크립트 실행의 핵심 도구
- **sessions_send**: 다른 에이전트에게 메시지 전달
- **web_search**: 웹 검색
`
}

/** 스킬 설치 시도 (ClawHub 또는 워크스페이스) */
async function installSkills(agentId: string, skills: string[], workspaceDir: string): Promise<string[]> {
  const results: string[] = []

  for (const skill of skills) {
    try {
      // ClawHub에서 설치 시도 (워크스페이스 디렉토리에서 실행)
      await execAsync(`cd "${workspaceDir}" && openclaw skills install "${skill}"`, { timeout: 30_000 })
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

/** 스모크 테스트 — 에이전트가 응답하는지 확인 (+ 비용 추적) */
async function smokeTest(agentId: string, divisionId?: string): Promise<{ passed: boolean; detail: string }> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || ''
  const startTime = Date.now()

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

    // 비용 추적 (fire-and-forget)
    const usage = extractUsageFromResponse(data)
    if (usage) {
      const model = resolveModelName(`openclaw:${agentId}`)
      recordLLMUsage({
        divisionId: divisionId || null,
        model,
        usage,
        caller: 'build',
        latencyMs: Date.now() - startTime,
        metadata: { action: 'smoke_test', openclaw_agent: agentId },
      }).catch(() => {})
    }

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
      // 이미 등록된 에이전트가 있으면 재사용
      const { data: existingAgent } = await supabase
        .from('agents')
        .select('id')
        .eq('division_id', divisionId)
        .eq('openclaw_agent_id', agent.id)
        .single()

      let dbAgentId: string
      if (existingAgent) {
        dbAgentId = existingAgent.id
        results.push(`Agent exists (reuse): ${agent.id}`)
      } else {
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
        dbAgentId = dbAgent.id
      }
      agentIdMap[agent.id] = dbAgentId

      const workspaceDir = `${body.workspacePath}/${agent.id}`

      // 디렉토리 생성
      try {
        await mkdir(workspaceDir, { recursive: true })
      } catch { /* exists */ }

      // OpenClaw 에이전트 등록 (먼저! — 기본 템플릿 생성됨)
      try {
        await execAsync(
          `openclaw agents add "${agent.id}" --workspace "${workspaceDir}" --model "${agent.model}" --non-interactive`,
          { timeout: 15_000 }
        )
        results.push(`Agent registered: ${agent.id}`)
      } catch (err) {
        results.push(`Agent register warning: ${agent.id}: ${String(err)}`)
      }

      // AGENTS.md 생성 (등록 후 덮어쓰기 — 역할 기반 커스텀 버전)
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
          generateAgentsMd(agent, body.name, pipelineContext || '독립 실행', body.executionScripts || [])
        )
        results.push(`AGENTS.md overwritten: ${agent.id}`)
      } catch (err) {
        results.push(`AGENTS.md warning: ${agent.id}: ${String(err)}`)
      }

      // agent_skills 기록
      if (agent.skills && agent.skills.length > 0) {
        for (const skill of agent.skills) {
          const { error: skillErr } = await supabase.from('agent_skills').insert({
            agent_id: dbAgentId,
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
    // Step 2.5: Requirements 등록 + 체크
    // ──────────────────────────────────────
    const missingRequirements: Array<{ agent: string; service: string; env: string; setupUrl?: string }> = []

    for (const agent of body.agents) {
      const reqs = agent.requirements
      if (!reqs || reqs.length === 0) continue

      for (const req of reqs) {
        if (req.type === 'none') continue

        // DB에 등록
        await supabase.from('agent_credentials').upsert({
          division_id: divisionId,
          agent_id: agentIdMap[agent.id] || null,
          service: req.service,
          type: req.type,
          env_key: req.env,
          status: 'missing',
          setup_url: req.setupUrl || null,
          description: req.description || null,
          required: req.required ?? true,
        }, { onConflict: 'division_id,env_key' })

        // 환경변수가 이미 설정되어 있는지 확인
        const envValue = process.env[req.env]
        if (envValue) {
          await supabase.from('agent_credentials')
            .update({ status: 'configured', env_value: '***', configured_at: new Date().toISOString() })
            .eq('division_id', divisionId)
            .eq('env_key', req.env)
          results.push(`Requirement OK: ${req.service} (${req.env})`)
        } else if (req.required) {
          missingRequirements.push({ agent: agent.name, service: req.service, env: req.env, setupUrl: req.setupUrl })
          results.push(`Requirement MISSING: ${req.service} (${req.env})`)
        }
      }
    }

    // 빠진 필수 requirements가 있으면 Critical Decision 생성 (직접 DB INSERT, self-call 방지)
    if (missingRequirements.length > 0) {
      await supabase.from('critical_decisions').insert({
        division_id: divisionId,
        priority: 'high',
        title: `외부 서비스 인증 필요 (${missingRequirements.length}개)`,
        description: missingRequirements.map(r =>
          `• ${r.agent} → ${r.service} (${r.env})${r.setupUrl ? ` — 설정: ${r.setupUrl}` : ''}`
        ).join('\n'),
        context: { missingRequirements },
        options: [
          { label: '설정 완료', description: '모든 API 키를 설정했습니다', recommended: true },
          { label: '나중에 설정', description: 'Division을 먼저 활성화하고 나중에 설정합니다' },
        ],
        recommendation: 0,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      results.push(`Critical Decision created: ${missingRequirements.length} missing requirements`)
    }

    await supabase.from('agent_events').insert({
      division_id: divisionId,
      event_type: 'build_progress',
      payload: {
        step: 2.5, stepName: 'Requirements 체크', status: missingRequirements.length > 0 ? 'warning' : 'completed',
        detail: `${missingRequirements.length}개 미설정`, progress: 42,
      },
    })

    // ──────────────────────────────────────
    // Step 2.7: Storage 버킷 생성 (file output이 있는 경우)
    // ──────────────────────────────────────
    const hasFileOutput = body.agents.some(a =>
      a.outputs?.some(o => o.type === 'file')
    )
    if (hasFileOutput) {
      try {
        const bucketName = `division-${divisionId}`
        const { data: buckets } = await supabase.storage.listBuckets()
        if (!buckets?.find(b => b.name === bucketName)) {
          await supabase.storage.createBucket(bucketName, { public: false })
          results.push(`Storage bucket created: ${bucketName}`)
        } else {
          results.push(`Storage bucket exists: ${bucketName}`)
        }
      } catch (err) {
        results.push(`Storage warning: ${String(err)}`)
      }
    }

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
    // Step 3.5: 실행 스크립트 생성
    // ──────────────────────────────────────
    const execScripts = body.executionScripts || []
    if (execScripts.length > 0) {
      for (const script of execScripts) {
        // agentId 매핑 (slug에 prefix 붙은 경우 처리)
        const fullAgentId = Object.keys(agentIdMap).find(k => k === script.agentId || k.endsWith(`_${script.agentId}`))
        const workspaceDir = fullAgentId ? `${body.workspacePath}/${fullAgentId}` : `${body.workspacePath}/${body.slug}_${script.agentId}`

        try {
          const scriptsDir = join(workspaceDir, 'scripts')
          await mkdir(scriptsDir, { recursive: true })

          const envLines = script.requirements.map(r => `${r} = os.environ.get("${r}")\nif not ${r}:\n    print(json.dumps({"error": "${r} 환경변수가 설정되지 않았습니다"}))\n    sys.exit(1)`).join('\n\n')

          const scriptContent = `#!/usr/bin/env python3
"""
${script.name} — ${script.purpose}
외부 서비스: ${script.externalService}
API 문서: ${script.apiDocs || 'N/A'}

입력: ${script.inputFormat}
출력: ${script.outputFormat}

사용법: python scripts/${script.name}.py '{"key": "value"}'
"""
import sys, os, json

# ── 환경변수 로드 ──
${envLines || '# 필요한 환경변수 없음'}

# ── 입력 파싱 ──
try:
    input_data = json.loads(sys.argv[1]) if len(sys.argv) > 1 else json.loads(sys.stdin.read())
except (json.JSONDecodeError, IndexError):
    print(json.dumps({"error": "유효한 JSON 입력이 필요합니다"}))
    sys.exit(1)

# ── 메인 로직 ──
# TODO: ${script.externalService} API 연동 구현
# API 문서: ${script.apiDocs || 'N/A'}
#
# 이 스크립트는 자동 생성된 템플릿입니다.
# 아래 주석을 실제 API 호출 코드로 교체하세요.
#
# 예시:
# import requests
# response = requests.post("https://api.example.com/...",
#     headers={"Authorization": f"Bearer {API_KEY}"},
#     json=input_data
# )
# result = response.json()

result = {
    "status": "script_template",
    "message": "이 스크립트는 아직 구현되지 않았습니다. ${script.externalService} API 연동이 필요합니다.",
    "service": "${script.externalService}",
    "input_received": input_data
}

# ── 출력 ──
print(json.dumps(result, ensure_ascii=False))
`
          await writeFile(join(scriptsDir, `${script.name}.py`), scriptContent)
          await execAsync(`chmod +x "${join(scriptsDir, `${script.name}.py`)}"`)
          results.push(`Script created: ${script.agentId}/scripts/${script.name}.py`)
        } catch (err) {
          results.push(`Script warning: ${script.name}: ${String(err)}`)
        }
      }

      await supabase.from('agent_events').insert({
        division_id: divisionId,
        event_type: 'build_progress',
        payload: { step: 3.5, stepName: '실행 스크립트 생성', status: 'completed', detail: `${execScripts.length}개`, progress: 58 },
      })
    }

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
      const result = await smokeTest(agent.id, divisionId)
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

    // 빌드 완료 메모리 저장 (직접 DB INSERT, self-call 방지)
    try {
      await supabase.from('memories').insert({
        division_id: divisionId,
        category: 'operations',
        content: `Division "${body.name}" 구축 완료. 에이전트 ${body.agents.length}개, 파이프라인 ${body.pipeline.length}단계. 스모크 테스트: ${allPassed ? '전체 통과' : '일부 실패'}.`,
        tags: ['build', 'division', body.slug],
        confidence: 0.8,
        source: 'division-builder',
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
