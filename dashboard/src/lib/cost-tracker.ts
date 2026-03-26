/**
 * LLM 비용 추적 유틸리티
 *
 * 모든 LLM API 호출의 토큰 사용량과 비용을 기록한다.
 * llm_usage 테이블에 per-call 로그를 남기면,
 * DB 트리거가 division_metrics에 일별 집계를 자동 sync한다.
 */

import { createServerClient } from '@supabase/ssr'

// ──────────────────────────────────────
// 가격표 (USD per 1M tokens)
// ──────────────────────────────────────

// USD per 1M tokens
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5':          { input: 2.00,  output: 8.00 },
  'gpt-5-mini':     { input: 0.30,  output: 1.20 },
  'gpt-4.1':        { input: 2.00,  output: 8.00 },
  'gpt-4.1-mini':   { input: 0.40,  output: 1.60 },
  'gpt-4.1-nano':   { input: 0.10,  output: 0.40 },
  'gpt-4o':         { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':    { input: 0.15,  output: 0.60 },
  'o3':             { input: 2.00,  output: 8.00 },
  'o3-mini':        { input: 1.10,  output: 4.40 },
  'o4-mini':        { input: 1.10,  output: 4.40 },
  // Embeddings (output = 0)
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  // Gemini (이미지 생성은 별도 단가)
  'gemini-2.5-flash':       { input: 0.15, output: 0.60 },
  'gemini-2.0-flash':       { input: 0.10, output: 0.40 },
}

// 알 수 없는 모델의 fallback 단가
const FALLBACK_PRICING = { input: 1.00, output: 4.00 }

// ──────────────────────────────────────
// 비용 계산
// ──────────────────────────────────────
export interface TokenUsage {
  input_tokens: number
  output_tokens: number
  total_tokens?: number
}

export function calculateCostUSD(model: string, usage: TokenUsage): number {
  const pricing = PRICING[model] || FALLBACK_PRICING
  const inputCost = (usage.input_tokens / 1_000_000) * pricing.input
  const outputCost = (usage.output_tokens / 1_000_000) * pricing.output
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000 // 소수 6자리 (USD)
}

// ──────────────────────────────────────
// DB 기록
// ──────────────────────────────────────
export interface LLMUsageRecord {
  divisionId?: string | null
  agentId?: string | null
  provider?: string
  model: string
  endpoint?: string
  usage: TokenUsage
  caller: string            // gateway | chat | proposal | build | memory | pipeline
  latencyMs?: number
  metadata?: Record<string, unknown>
}

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

/**
 * LLM 사용량을 DB에 기록 (fire-and-forget)
 * 실패해도 메인 로직에 영향 없음
 */
export async function recordLLMUsage(record: LLMUsageRecord): Promise<void> {
  try {
    const costUsd = calculateCostUSD(record.model, record.usage)
    const supabase = getSupabase()

    await supabase.from('llm_usage').insert({
      division_id: record.divisionId || null,
      agent_id: record.agentId || null,
      provider: record.provider || 'openai',
      model: record.model,
      endpoint: record.endpoint || 'responses',
      input_tokens: record.usage.input_tokens,
      output_tokens: record.usage.output_tokens,
      total_tokens: record.usage.total_tokens || (record.usage.input_tokens + record.usage.output_tokens),
      cost_usd: costUsd,
      caller: record.caller,
      latency_ms: record.latencyMs || null,
      metadata: record.metadata || {},
    })
  } catch (err) {
    // 비용 기록 실패는 로그만 남기고 무시 — 메인 기능 블로킹 금지
    console.error('[cost-tracker] Failed to record LLM usage:', err)
  }
}

// ──────────────────────────────────────
// OpenResponses 형식에서 usage 추출
// ──────────────────────────────────────
export interface OpenResponsesUsage {
  input_tokens: number
  output_tokens: number
  total_tokens: number
}

/**
 * OpenClaw Gateway (OpenResponses) 응답에서 usage 데이터 추출
 * Gateway가 OpenAI usage를 패스스루하는 경우 사용
 */
export function extractUsageFromResponse(data: Record<string, unknown>): OpenResponsesUsage | null {
  // OpenAI Responses API format: { usage: { input_tokens, output_tokens, total_tokens } }
  const usage = data.usage as Record<string, number> | undefined
  if (usage && typeof usage.input_tokens === 'number') {
    return {
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens || 0,
      total_tokens: usage.total_tokens || (usage.input_tokens + (usage.output_tokens || 0)),
    }
  }

  // OpenAI Chat Completions format fallback: { usage: { prompt_tokens, completion_tokens } }
  if (usage && typeof usage.prompt_tokens === 'number') {
    return {
      input_tokens: usage.prompt_tokens,
      output_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || (usage.prompt_tokens + (usage.completion_tokens || 0)),
    }
  }

  return null
}

/**
 * SSE 스트림에서 usage 데이터 추출
 * OpenAI의 streaming response는 마지막 이벤트에 usage를 포함
 */
export function extractUsageFromSSE(eventData: string): OpenResponsesUsage | null {
  try {
    const parsed = JSON.parse(eventData)

    // response.completed 이벤트에 전체 response 포함
    if (parsed.type === 'response.completed' && parsed.response?.usage) {
      return extractUsageFromResponse(parsed.response)
    }

    // 직접 usage 필드가 있는 경우
    if (parsed.usage) {
      return extractUsageFromResponse(parsed)
    }

    return null
  } catch {
    return null
  }
}

/**
 * 모델명에서 실제 LLM 모델 추출
 * OpenClaw는 "openclaw:agent-id" 형태로 호출하고, 실제 모델은 agent config에 있음
 * fallback으로 기본 모델 반환
 */
export function resolveModelName(openclawModel: string, agentModel?: string): string {
  if (agentModel) return agentModel
  // openclaw:xxx 형태에서는 실제 모델을 알 수 없으므로 fallback
  if (openclawModel.startsWith('openclaw:')) return 'gpt-5-mini'
  return openclawModel
}
