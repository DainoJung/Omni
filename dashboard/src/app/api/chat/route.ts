import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { message, sessionId } = await request.json()

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

    // Proxy the SSE stream from Gateway to client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const decoder = new TextDecoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
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
