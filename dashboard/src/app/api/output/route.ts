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
 * POST /api/output — Save a pipeline step output
 *
 * Body (JSON):
 *   { divisionId, agentId?, pipelineRunId, stepName, stepOrder, outputType, outputData, outputFormat? }
 *
 * Body (FormData — 파일 업로드):
 *   divisionId, pipelineRunId, stepName, stepOrder, outputType, outputFormat, file
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  const supabase = getSupabase()

  // ──────────────────────────────────────
  // FormData (파일 업로드)
  // ──────────────────────────────────────
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const divisionId = formData.get('divisionId') as string
    const pipelineRunId = formData.get('pipelineRunId') as string
    const stepName = formData.get('stepName') as string
    const stepOrder = parseInt(formData.get('stepOrder') as string || '0')
    const outputType = formData.get('outputType') as string || 'file'
    const outputFormat = formData.get('outputFormat') as string || 'binary'
    const agentId = formData.get('agentId') as string | null
    const description = formData.get('description') as string | null

    if (!file || !divisionId || !pipelineRunId || !stepName) {
      return NextResponse.json({ error: 'file, divisionId, pipelineRunId, stepName 필요' }, { status: 400 })
    }

    // Division별 Storage 버킷 확인/생성
    const bucketName = `division-${divisionId}`
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.find(b => b.name === bucketName)) {
      await supabase.storage.createBucket(bucketName, { public: false })
    }

    // 파일 업로드
    const filePath = `${pipelineRunId}/${stepName}/${file.name}`
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // 서명된 URL 생성 (1시간)
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600)

    const fileUrl = urlData?.signedUrl || null

    // DB 저장
    const { data, error } = await supabase
      .from('pipeline_outputs')
      .insert({
        division_id: divisionId,
        agent_id: agentId || null,
        pipeline_run_id: pipelineRunId,
        step_name: stepName,
        step_order: stepOrder,
        output_type: outputType,
        output_format: outputFormat,
        output_data: { fileName: file.name, fileSize: file.size, mimeType: file.type, description },
        file_url: fileUrl,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('agent_events').insert({
      agent_id: agentId || null,
      division_id: divisionId,
      event_type: 'task_complete',
      payload: { action: `pipeline_${stepName}`, pipeline_run_id: pipelineRunId, output_type: outputType, output_id: data.id, fileName: file.name },
    })

    return NextResponse.json({ id: data.id, fileUrl, success: true })
  }

  // ──────────────────────────────────────
  // JSON (기존 방식)
  // ──────────────────────────────────────
  const { divisionId, agentId, pipelineRunId, stepName, stepOrder, outputType, outputData, outputFormat } = await request.json()

  const insertData: Record<string, unknown> = {
    division_id: divisionId,
    agent_id: agentId || null,
    pipeline_run_id: pipelineRunId,
    step_name: stepName,
    step_order: stepOrder,
    output_type: outputType,
    output_data: outputData,
  }
  // output_format과 file_url은 DB 컬럼이 있을 때만 포함 (마이그레이션 005)
  if (outputFormat) insertData.output_format = outputFormat

  const { data, error } = await supabase
    .from('pipeline_outputs')
    .insert(insertData)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('agent_events').insert({
    agent_id: agentId || null,
    division_id: divisionId,
    event_type: 'task_complete',
    payload: { action: `pipeline_${stepName}`, pipeline_run_id: pipelineRunId, output_type: outputType, output_id: data.id },
  })

  return NextResponse.json({ id: data.id, success: true })
}

/**
 * GET /api/output — Get pipeline outputs + signed URLs for files
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const divisionId = searchParams.get('divisionId')
  const pipelineRunId = searchParams.get('runId')
  const limit = parseInt(searchParams.get('limit') || '20')

  const supabase = getSupabase()

  let query = supabase
    .from('pipeline_outputs')
    .select('*, agents(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (divisionId) query = query.eq('division_id', divisionId)
  if (pipelineRunId) query = query.eq('pipeline_run_id', pipelineRunId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // file_url이 만료됐을 수 있으므로 새 서명 URL 생성
  const outputs = await Promise.all((data ?? []).map(async (o) => {
    if (o.file_url && o.output_data?.fileName) {
      const bucketName = `division-${o.division_id}`
      const filePath = `${o.pipeline_run_id}/${o.step_name}/${o.output_data.fileName}`
      const { data: urlData } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 3600)
      return { ...o, file_url: urlData?.signedUrl || o.file_url }
    }
    return o
  }))

  return NextResponse.json({ outputs })
}
