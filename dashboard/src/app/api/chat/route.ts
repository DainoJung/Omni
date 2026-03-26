import { NextRequest } from 'next/server'
import { extractUsageFromSSE, recordLLMUsage, resolveModelName } from '@/lib/cost-tracker'

export async function POST(request: NextRequest) {
  const { message, sessionId, divisionId } = await request.json()

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
        model: 'openclaw:orchestrator',
        input: message,
        stream: true,
        ...(sessionId ? { previous_response_id: sessionId } : {}),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return new Response(JSON.stringify({ error: `Gateway error: ${response.status}`, detail: error }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Proxy the SSE stream from Gateway to client, capturing usage from final event
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let sseBuffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)

            // SSE 이벤트에서 usage 추출 시도
            sseBuffer += decoder.decode(value, { stream: true })
            const lines = sseBuffer.split('\n')
            // 마지막 불완전한 줄은 버퍼에 유지
            sseBuffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const eventData = line.slice(6).trim()
              if (eventData === '[DONE]') continue

              const usage = extractUsageFromSSE(eventData)
              if (usage) {
                // 스트림 마지막에 usage가 오면 기록 (fire-and-forget)
                const model = resolveModelName('openclaw:orchestrator')
                recordLLMUsage({
                  divisionId: divisionId || null,
                  model,
                  usage,
                  caller: 'chat',
                  latencyMs: Date.now() - startTime,
                  metadata: { sessionId, openclaw_agent: 'orchestrator' },
                }).catch(() => {})
              }
            }
          }
        } catch {
          // Stream interrupted
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Orchestrator 연결 실패', detail: String(err) }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
