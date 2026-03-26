import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

/**
 * GET /api/agent/credentials?divisionId=xxx
 * Division의 모든 requirements 상태 조회
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const divisionId = searchParams.get('divisionId')
  const status = searchParams.get('status')

  const supabase = getSupabase()

  let query = supabase
    .from('agent_credentials')
    .select('*, agents(name)')
    .order('created_at')

  if (divisionId) query = query.eq('division_id', divisionId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // env_value를 마스킹해서 반환 (보안)
  const masked = (data ?? []).map(c => ({
    ...c,
    env_value: c.env_value ? '••••••' + c.env_value.slice(-4) : null,
    hasValue: !!c.env_value,
  }))

  return NextResponse.json({ credentials: masked })
}

/**
 * POST /api/agent/credentials
 * 새 requirement 등록 (Build 과정에서 호출)
 */
export async function POST(request: NextRequest) {
  const { divisionId, agentId, service, type, envKey, envValue, setupUrl, description, required } = await request.json()

  if (!divisionId || !service || !envKey) {
    return NextResponse.json({ error: 'divisionId, service, envKey가 필요합니다' }, { status: 400 })
  }

  const supabase = getSupabase()

  // upsert (같은 division + env_key면 업데이트)
  const { data, error } = await supabase
    .from('agent_credentials')
    .upsert({
      division_id: divisionId,
      agent_id: agentId || null,
      service,
      type: type || 'api_key',
      env_key: envKey,
      env_value: envValue || null,
      status: envValue ? 'configured' : 'missing',
      setup_url: setupUrl || null,
      description: description || null,
      required: required ?? true,
      configured_at: envValue ? new Date().toISOString() : null,
    }, { onConflict: 'division_id,env_key' })
    .select('id, service, env_key, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ credential: data })
}

/**
 * PATCH /api/agent/credentials
 * 사용자가 API 키/인증 정보를 입력할 때
 */
export async function PATCH(request: NextRequest) {
  const { id, envValue } = await request.json()

  if (!id || !envValue) {
    return NextResponse.json({ error: 'id와 envValue가 필요합니다' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('agent_credentials')
    .update({
      env_value: envValue,
      status: 'configured',
      configured_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, service, env_key, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 이벤트 기록
  const { data: cred } = await supabase
    .from('agent_credentials')
    .select('division_id, service')
    .eq('id', id)
    .single()

  if (cred) {
    await supabase.from('agent_events').insert({
      division_id: cred.division_id,
      event_type: 'task_complete',
      payload: { action: 'credential_configured', service: cred.service },
    })
  }

  return NextResponse.json({ credential: data })
}
