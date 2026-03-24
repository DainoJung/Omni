import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { proposal, targetMarket, revenueModel, budget } = await request.json()

  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || ''

  const message = [
    `사업 제안: ${proposal}`,
    targetMarket ? `타겟 고객: ${targetMarket}` : '',
    revenueModel ? `수익 모델: ${revenueModel}` : '',
    budget ? `월 예산: ${budget}` : '',
    '',
    'Phase 0 설계안 포맷으로 출력해줘:',
    '- 역량 분석 (✅ ClawHub 매칭, 🔨 자동 생성)',
    '- 에이전트 구성 (ID, 모델, 스케줄)',
    '- 파이프라인',
    '- 예상 비용',
    '',
    'Institutional Memory에서 관련 교훈을 반드시 참조해서 반영해.',
  ].filter(Boolean).join('\n')

  try {
    const response = await fetch(`${gatewayUrl}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        model: 'openclaw:division-builder',
        input: message,
        stream: false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `Gateway error: ${response.status}`, detail: error },
        { status: 502 }
      )
    }

    const data = await response.json()

    // Extract text from OpenResponses format
    let text = ''
    if (data.output) {
      for (const item of data.output) {
        if (item.type === 'message' && item.content) {
          for (const c of item.content) {
            if (c.type === 'output_text') text += c.text
          }
        }
      }
    }

    return NextResponse.json({ result: text || JSON.stringify(data) })
  } catch (err) {
    return NextResponse.json(
      { error: 'Gateway 연결 실패', detail: String(err) },
      { status: 503 }
    )
  }
}
