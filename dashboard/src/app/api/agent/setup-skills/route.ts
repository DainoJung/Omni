import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const execAsync = promisify(exec)

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

/** 역할 키워드 → ClawHub 검색 쿼리 매핑 */
function roleToSearchQueries(role: string, name: string): string[] {
  const queries: string[] = []
  const text = `${role} ${name}`.toLowerCase()

  // 공통 키워드 매핑
  const keywordMap: Record<string, string[]> = {
    'researcher': ['web search', 'web scraping', 'data collection', 'trend analysis'],
    'research': ['web search', 'research', 'data analysis'],
    'writer': ['text generation', 'content writer', 'blog writer', 'copywriting'],
    'publisher': ['blog publish', 'wordpress', 'social media post', 'content publish'],
    'marketer': ['marketing', 'seo', 'social media', 'analytics'],
    'analyst': ['data analysis', 'analytics', 'reporting'],
    'designer': ['image generation', 'design', 'ui design'],
    'developer': ['code generation', 'api', 'programming'],
    'customer': ['customer support', 'chatbot', 'helpdesk'],
    'sales': ['crm', 'lead generation', 'sales automation'],
    'youtube': ['youtube api', 'youtube', 'video'],
    'blog': ['blog', 'wordpress', 'cms'],
    'recipe': ['recipe', 'food', 'cooking'],
    'trend': ['trend', 'trending', 'popular'],
    'keyword': ['keyword', 'seo keyword', 'keyword research'],
    'image': ['image generation', 'image', 'dall-e'],
    'scraping': ['web scraping', 'scraper', 'crawler'],
    'email': ['email', 'newsletter', 'email marketing'],
    'commerce': ['ecommerce', 'product', 'shop'],
  }

  for (const [keyword, searchTerms] of Object.entries(keywordMap)) {
    if (text.includes(keyword)) {
      queries.push(...searchTerms)
    }
  }

  // 역할 자체를 직접 검색어로
  const roleParts = role.split(/[,+→\n]/).map(s => s.trim()).filter(Boolean)
  for (const part of roleParts) {
    if (part.length > 3 && part.length < 50) {
      queries.push(part)
    }
  }

  // 중복 제거, 최대 8개
  return [...new Set(queries)].slice(0, 8)
}

/** 의심스러운 스킬 판별 */
function isSuspicious(name: string, description?: string, score?: number): boolean {
  // 1. 점수가 너무 낮으면 관련성 낮음
  if (score !== undefined && score < 2.0) return true

  // 2. 설명이 없거나 너무 짧으면 신뢰 어려움
  if (!description || description.length < 10) return true

  // 3. slug에 의심스러운 패턴
  const suspiciousPatterns = [
    /^test-?/i,           // test-something
    /hack/i,
    /crack/i,
    /exploit/i,
    /bypass/i,
    /inject/i,
    /steal/i,
    /phish/i,
    /malware/i,
    /trojan/i,
  ]
  if (suspiciousPatterns.some(p => p.test(name))) return true

  // 4. 설명에 민감한 키워드
  const descLower = (description || '').toLowerCase()
  const dangerousDesc = ['password', 'credential', 'token steal', 'keylog', 'backdoor', 'reverse shell']
  if (dangerousDesc.some(d => descLower.includes(d))) return true

  return false
}

interface ClawHubResult {
  query: string
  skills: Array<{ name: string; description?: string; rating?: number; downloads?: number }>
}

/**
 * POST /api/agent/setup-skills
 *
 * 에이전트의 역할(role)을 기반으로 ClawHub에서 적절한 스킬을 탐색하고 설치한다.
 *
 * Body: { agentId: string, dryRun?: boolean, hideSuspicious?: boolean }
 * - dryRun=true: 검색만 하고 설치하지 않음 (미리보기)
 * - hideSuspicious=true: 의심스러운 스킬 필터링 (기본값 true)
 */
export async function POST(request: NextRequest) {
  const { agentId, dryRun = false, hideSuspicious = true } = await request.json()

  if (!agentId) {
    return NextResponse.json({ error: 'agentId가 필요합니다' }, { status: 400 })
  }

  const supabase = getSupabase()

  // 에이전트 조회
  const { data: agent, error: fetchErr } = await supabase
    .from('agents')
    .select('id, openclaw_agent_id, name, role, division_id, divisions(slug)')
    .eq('id', agentId)
    .single()

  if (fetchErr || !agent) {
    return NextResponse.json({ error: '에이전트를 찾을 수 없습니다' }, { status: 404 })
  }

  const results: string[] = []
  const searchResults: ClawHubResult[] = []
  const recommendedSkills: Array<{ name: string; source: string; query: string; description?: string; trusted: boolean }> = []
  let filteredCount = 0

  // ──────────────────────────────────────
  // 0. 화이트리스트 로드 (hideSuspicious 모드)
  // ──────────────────────────────────────
  const whitelistedNames = new Set<string>()
  if (hideSuspicious) {
    const { data: whitelist } = await supabase
      .from('skill_whitelist')
      .select('skill_name')
    for (const w of whitelist ?? []) {
      whitelistedNames.add(w.skill_name)
    }
    results.push(`Whitelist loaded: ${whitelistedNames.size} trusted skills`)
  }

  // ──────────────────────────────────────
  // 1. 역할 기반 검색 쿼리 생성
  // ──────────────────────────────────────
  const queries = roleToSearchQueries(agent.role, agent.name)
  results.push(`Generated ${queries.length} search queries from role: "${agent.role}"`)

  // ──────────────────────────────────────
  // 2. ClawHub 검색 실행
  // ──────────────────────────────────────
  for (const query of queries) {
    try {
      const { stdout } = await execAsync(
        `openclaw skills search "${query.replace(/"/g, '\\"')}" --json 2>/dev/null || echo "[]"`,
        { timeout: 15_000 }
      )

      let skills: Array<{ name: string; description?: string; score?: number }> = []
      try {
        const parsed = JSON.parse(stdout)
        // ClawHub JSON: { results: [{ slug, displayName, summary, score }] }
        const rawResults = Array.isArray(parsed) ? parsed : (parsed.results ?? [])
        skills = rawResults.map((r: Record<string, unknown>) => ({
          name: (r.slug || r.name || '') as string,
          description: (r.summary || r.displayName || r.description || '') as string,
          score: (r.score || 0) as number,
        })).filter((s: { name: string }) => s.name)
      } catch {
        // 비-JSON fallback (plain text)
        const lines = stdout.trim().split('\n').filter(l => l.trim() && !l.startsWith('['))
        skills = lines.map(line => {
          const parts = line.split(/\s{2,}/)
          return { name: parts[0]?.trim() || '', description: parts[1]?.trim() }
        }).filter(s => s.name)
      }

      if (skills.length > 0) {
        searchResults.push({ query, skills: skills.slice(0, 5) })

        // 상위 2개를 추천 목록에 추가 (suspicious 필터링 적용)
        for (const skill of skills.slice(0, 5)) {
          if (recommendedSkills.find(r => r.name === skill.name)) continue
          if (recommendedSkills.length >= 16) break // 전체 추천 상한

          const trusted = whitelistedNames.has(skill.name)

          // hideSuspicious 모드: 의심스러운 스킬 필터링
          if (hideSuspicious && !trusted) {
            const dominated = isSuspicious(skill.name, skill.description, skill.score)
            if (dominated) {
              filteredCount++
              results.push(`Filtered (suspicious): ${skill.name}`)
              continue
            }
          }

          recommendedSkills.push({
            name: skill.name,
            source: 'clawhub',
            query,
            description: skill.description,
            trusted,
          })
        }
      }

      results.push(`Search "${query}": ${skills.length} results`)
    } catch (err) {
      results.push(`Search "${query}": failed (${String(err)})`)
    }
  }

  // dryRun이면 여기서 반환
  if (dryRun) {
    return NextResponse.json({
      agentId,
      agentName: agent.name,
      role: agent.role,
      queries,
      searchResults,
      recommendedSkills,
      filteredCount,
      hideSuspicious,
      results,
      dryRun: true,
    })
  }

  // ──────────────────────────────────────
  // 3. 스킬 설치
  // ──────────────────────────────────────
  const installed: string[] = []
  const failed: string[] = []

  // 이미 설치된 스킬 확인
  const { data: existingSkills } = await supabase
    .from('agent_skills')
    .select('skill_name')
    .eq('agent_id', agentId)
  const existingNames = new Set((existingSkills ?? []).map(s => s.skill_name))

  // 워크스페이스 경로
  const divSlug = (agent.divisions as unknown as { slug: string } | null)?.slug || ''
  const agentSlug = agent.openclaw_agent_id.split('_').pop() || agent.openclaw_agent_id
  const workspacePath = join(process.cwd(), 'agents', divSlug, agentSlug)

  for (const skill of recommendedSkills) {
    if (existingNames.has(skill.name)) {
      results.push(`Skip "${skill.name}": already installed`)
      continue
    }

    try {
      // ClawHub 설치 시도
      // openclaw skills install은 active workspace에 설치. --workspace로 경로 지정.
      await execAsync(
        `cd "${workspacePath}" && openclaw skills install "${skill.name}"`,
        { timeout: 30_000 }
      )
      installed.push(skill.name)

      // DB 기록
      await supabase.from('agent_skills').insert({
        agent_id: agentId,
        skill_name: skill.name,
        source: 'clawhub',
      })

      results.push(`Installed (clawhub): ${skill.name}`)
    } catch {
      // ClawHub 설치 실패 → workspace 스킬 scaffold
      try {
        const skillDir = join(workspacePath, 'skills', skill.name)
        await mkdir(skillDir, { recursive: true })
        await writeFile(
          join(skillDir, 'SKILL.md'),
          `---
name: ${skill.name}
description: ${skill.description || `Auto-generated skill for ${agent.role}`}
version: 0.1.0
metadata:
  openclaw:
    emoji: "🔧"
---

# ${skill.name}

## 설명
${skill.description || `${agent.name}의 ${agent.role} 역할을 위한 스킬`}

## 검색 키워드
${skill.query}

## TODO
- [ ] 스킬 로직 구현
- [ ] 테스트 작성
`
        )

        installed.push(skill.name)
        await supabase.from('agent_skills').insert({
          agent_id: agentId,
          skill_name: skill.name,
          source: 'workspace',
        })

        results.push(`Created scaffold (workspace): ${skill.name}`)
      } catch (err) {
        failed.push(skill.name)
        results.push(`Failed: ${skill.name} — ${String(err)}`)
      }
    }
  }

  // ──────────────────────────────────────
  // 4. 이벤트 기록
  // ──────────────────────────────────────
  await supabase.from('agent_events').insert({
    agent_id: agentId,
    division_id: agent.division_id,
    event_type: 'task_complete',
    payload: {
      action: 'setup_skills',
      detail: `스킬 설정: ${installed.length}개 설치, ${failed.length}개 실패`,
      installed,
      failed,
      searchQueries: queries.length,
      totalFound: recommendedSkills.length,
    },
  })

  return NextResponse.json({
    agentId,
    agentName: agent.name,
    role: agent.role,
    installed,
    failed,
    searchResults,
    recommendedSkills,
    results,
  })
}
