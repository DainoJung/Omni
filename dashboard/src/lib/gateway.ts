// OpenClaw Gateway 호출 공통 유틸리티

import { extractUsageFromResponse, recordLLMUsage, resolveModelName, type TokenUsage } from './cost-tracker'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ''

interface GatewayOptions {
  stream?: boolean
  timeoutMs?: number
}

/** 비용 추적을 위한 컨텍스트 */
export interface CostContext {
  caller: string              // 어디서 호출했는지 (proposal, build, pipeline 등)
  divisionId?: string | null
  agentId?: string | null
  agentModel?: string         // 에이전트에 설정된 실제 LLM 모델명
  metadata?: Record<string, unknown>
}

/**
 * OpenClaw Gateway를 통해 에이전트 호출
 * @param agentId - openclaw.json에 등록된 에이전트 ID (e.g. "orchestrator", "division-builder")
 * @param message - 에이전트에게 보낼 메시지
 * @param options - stream, timeout 등
 * @returns stream=true면 Response, false면 텍스트
 */
export async function callAgent(agentId: string, message: string, options?: GatewayOptions & { stream: true }, costCtx?: CostContext): Promise<Response>
export async function callAgent(agentId: string, message: string, options?: GatewayOptions & { stream?: false }, costCtx?: CostContext): Promise<string>
export async function callAgent(agentId: string, message: string, options: GatewayOptions = {}, costCtx?: CostContext): Promise<Response | string> {
  const { stream = false, timeoutMs = 120_000 } = options
  const startTime = Date.now()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${GATEWAY_URL}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        model: `openclaw:${agentId}`,
        input: message,
        stream,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Gateway ${response.status}: ${detail}`)
    }

    if (stream) return response

    const data = await response.json()
    const text = extractTextFromResponse(data)

    // 비용 추적: usage 데이터가 있으면 기록 (fire-and-forget)
    const usage = extractUsageFromResponse(data)
    if (usage) {
      const model = resolveModelName(`openclaw:${agentId}`, costCtx?.agentModel)
      recordLLMUsage({
        divisionId: costCtx?.divisionId,
        agentId: costCtx?.agentId,
        model,
        usage,
        caller: costCtx?.caller || 'gateway',
        latencyMs: Date.now() - startTime,
        metadata: { ...costCtx?.metadata, openclaw_agent: agentId },
      }).catch(() => {}) // fire-and-forget
    }

    return text
  } finally {
    clearTimeout(timeout)
  }
}

/** OpenResponses 형식에서 텍스트 추출 */
export function extractTextFromResponse(data: Record<string, unknown>): string {
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
}

/** 에이전트 응답에서 JSON 블록 추출 */
export function extractJsonFromText(text: string): Record<string, unknown> | null {
  // 1. ```json ... ``` 코드블록에서 추출
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch { /* fall through */ }
  }

  // 2. 가장 큰 { ... } 블록에서 추출
  const braceStart = text.indexOf('{')
  const braceEnd = text.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(text.slice(braceStart, braceEnd + 1))
    } catch { /* fall through */ }
  }

  return null
}
