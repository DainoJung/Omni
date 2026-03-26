import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readdir } from 'fs/promises'
import { join } from 'path'

const execAsync = promisify(exec)

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

/**
 * POST /api/agent/sync
 *
 * 에이전트의 실제 OpenClaw 워크스페이스를 스캔하고 DB와 동기화한다.
 * - 워크스페이스 skills/ 디렉토리에서 설치된 스킬 목록 수집
 * - agent_skills 테이블에 반영 (없으면 추가, 있으면 유지)
 * - 에이전트 상태 업데이트
 *
 * Body: { agentId: string (DB UUID) }
 */
export async function POST(request: NextRequest) {
  const { agentId } = await request.json()

  if (!agentId) {
    return NextResponse.json({ error: 'agentId가 필요합니다' }, { status: 400 })
  }

  const supabase = getSupabase()

  // 에이전트 조회
  const { data: agent, error: fetchErr } = await supabase
    .from('agents')
    .select('id, openclaw_agent_id, name, division_id, divisions(slug)')
    .eq('id', agentId)
    .single()

  if (fetchErr || !agent) {
    return NextResponse.json({ error: '에이전트를 찾을 수 없습니다' }, { status: 404 })
  }

  const results: string[] = []
  const discoveredSkills: Array<{ name: string; source: string }> = []

  // ──────────────────────────────────────
  // 1. 워크스페이스 경로 찾기
  // ──────────────────────────────────────
  let workspacePath = ''
  try {
    const { stdout } = await execAsync(`openclaw agents list --json 2>/dev/null || echo "[]"`, { timeout: 10_000 })
    const agents = JSON.parse(stdout)
    const match = agents.find?.((a: { id: string; workspace?: string }) => a.id === agent.openclaw_agent_id)
    if (match?.workspace) {
      workspacePath = match.workspace
    }
  } catch {
    // fallback: 추정 경로
  }

  if (!workspacePath) {
    // 관례 기반 경로 추정
    const divSlug = (agent.divisions as unknown as { slug: string } | null)?.slug || ''
    const possiblePaths = [
      join(process.env.HOME || '~', '.openclaw', 'workspaces', agent.openclaw_agent_id),
      join(process.cwd(), 'agents', divSlug, agent.openclaw_agent_id.split('_').pop() || ''),
      join(process.cwd(), 'agents', agent.openclaw_agent_id),
    ]

    for (const p of possiblePaths) {
      try {
        await readdir(p)
        workspacePath = p
        break
      } catch { /* next */ }
    }
  }

  // ──────────────────────────────────────
  // 2. 워크스페이스 스킬 디렉토리 스캔
  // ──────────────────────────────────────
  if (workspacePath) {
    results.push(`Workspace: ${workspacePath}`)

    // workspace skills/ 디렉토리
    try {
      const skillsDir = join(workspacePath, 'skills')
      const entries = await readdir(skillsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          discoveredSkills.push({ name: entry.name, source: 'workspace' })
        }
      }
      results.push(`Workspace skills found: ${discoveredSkills.length}`)
    } catch {
      results.push('No workspace skills/ directory')
    }

    // .openclaw/skills/ (글로벌 설치된 스킬)
    try {
      const globalSkillsDir = join(workspacePath, '.openclaw', 'skills')
      const entries = await readdir(globalSkillsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && !discoveredSkills.find(s => s.name === entry.name)) {
          discoveredSkills.push({ name: entry.name, source: 'clawhub' })
        }
      }
    } catch { /* no global skills */ }
  } else {
    results.push('Workspace path not found — scanning OpenClaw CLI')
  }

  // ──────────────────────────────────────
  // 3. openclaw skills list로 추가 확인
  // ──────────────────────────────────────
  try {
    const { stdout } = await execAsync(
      `openclaw skills list --agent "${agent.openclaw_agent_id}" --json 2>/dev/null || echo "[]"`,
      { timeout: 10_000 }
    )
    const cliSkills = JSON.parse(stdout)
    if (Array.isArray(cliSkills)) {
      for (const s of cliSkills) {
        const name = s.name || s
        if (!discoveredSkills.find(d => d.name === name)) {
          discoveredSkills.push({ name, source: s.source || 'clawhub' })
        }
      }
    }
  } catch {
    results.push('openclaw skills list not available')
  }

  // ──────────────────────────────────────
  // 4. DB 동기화
  // ──────────────────────────────────────
  const { data: existingSkills } = await supabase
    .from('agent_skills')
    .select('skill_name')
    .eq('agent_id', agentId)

  const existingNames = new Set((existingSkills ?? []).map(s => s.skill_name))
  let added = 0

  for (const skill of discoveredSkills) {
    if (!existingNames.has(skill.name)) {
      await supabase.from('agent_skills').insert({
        agent_id: agentId,
        skill_name: skill.name,
        source: skill.source,
      })
      added++
    }
  }

  results.push(`Synced: ${added} new skills added, ${existingNames.size} already existed`)

  // 이벤트 기록
  await supabase.from('agent_events').insert({
    agent_id: agentId,
    division_id: agent.division_id,
    event_type: 'task_complete',
    payload: {
      action: 'agent_sync',
      detail: `스킬 동기화 완료: ${discoveredSkills.length}개 발견, ${added}개 추가`,
      discoveredSkills,
    },
  })

  return NextResponse.json({
    agentId,
    workspacePath,
    discoveredSkills,
    added,
    results,
  })
}
