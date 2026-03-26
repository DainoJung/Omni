import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { calculateCostUSD } from '@/lib/cost-tracker'

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

/**
 * POST /api/llm-usage — 에이전트가 파이프라인 실행 중 LLM 사용량을 기록
 *
 * Body: {
 *   divisionId?: string,
 *   agentId?: string,
 *   provider?: string,       // default: "openai"
 *   model: string,           // "gpt-5-mini" 등
 *   endpoint?: string,       // default: "responses"
 *   inputTokens: number,
 *   outputTokens: number,
 *   caller?: string,         // default: "pipeline"
 *   latencyMs?: number,
 *   metadata?: object
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { divisionId, agentId, provider, model, endpoint, inputTokens, outputTokens, caller, latencyMs, metadata } = body

    if (!model || typeof inputTokens !== 'number' || typeof outputTokens !== 'number') {
      return NextResponse.json(
        { error: 'model, inputTokens, outputTokens are required' },
        { status: 400 }
      )
    }

    const totalTokens = inputTokens + outputTokens
    const costUsd = calculateCostUSD(model, { input_tokens: inputTokens, output_tokens: outputTokens })

    const supabase = getSupabase()
    const { error } = await supabase.from('llm_usage').insert({
      division_id: divisionId || null,
      agent_id: agentId || null,
      provider: provider || 'openai',
      model,
      endpoint: endpoint || 'responses',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
      caller: caller || 'pipeline',
      latency_ms: latencyMs || null,
      metadata: metadata || {},
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, costUsd, totalTokens })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * GET /api/llm-usage — 사용량 조회
 *
 * Query: divisionId?, days? (default 7), model?, caller?
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const divisionId = searchParams.get('divisionId')
  const days = parseInt(searchParams.get('days') || '7')
  const model = searchParams.get('model')
  const caller = searchParams.get('caller')

  const supabase = getSupabase()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('llm_usage')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)

  if (divisionId) query = query.eq('division_id', divisionId)
  if (model) query = query.eq('model', model)
  if (caller) query = query.eq('caller', caller)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 요약 통계
  const summary = {
    totalCalls: data?.length || 0,
    totalTokens: data?.reduce((s, r) => s + r.total_tokens, 0) || 0,
    totalCostUsd: data?.reduce((s, r) => s + Number(r.cost_usd), 0) || 0,
    byModel: {} as Record<string, { calls: number; tokens: number; costUsd: number }>,
  }

  for (const row of data || []) {
    const m = row.model
    if (!summary.byModel[m]) summary.byModel[m] = { calls: 0, tokens: 0, costUsd: 0 }
    summary.byModel[m].calls++
    summary.byModel[m].tokens += row.total_tokens
    summary.byModel[m].costUsd += Number(row.cost_usd)
  }

  return NextResponse.json({ summary, records: data })
}
