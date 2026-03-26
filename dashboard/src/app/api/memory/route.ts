import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.data[0].embedding
  } catch {
    return null
  }
}

function getSupabase() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

// ──────────────────────────────────────
// POST: Save memory with auto-embedding
// ──────────────────────────────────────
export async function POST(request: NextRequest) {
  const { divisionId, category, content, tags, confidence, source } = await request.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: 'content가 필요합니다' }, { status: 400 })
  }

  const supabase = getSupabase()
  const embedding = await generateEmbedding(content)

  const { data, error } = await supabase
    .from('memories')
    .insert({
      division_id: divisionId || null,
      category: category || 'operations',
      content,
      tags: tags || [],
      confidence: confidence ?? 0.5,
      source: source || null,
      embedding: embedding ? `[${embedding.join(',')}]` : null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, hasEmbedding: !!embedding })
}

// ──────────────────────────────────────
// GET: Search or list memories
// ──────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category')
  const tagsParam = searchParams.get('tags')
  const limit = parseInt(searchParams.get('limit') || '50')
  const mode = searchParams.get('mode') // 'list' = 전체 목록, default = 검색
  const tags = tagsParam ? tagsParam.split(',') : null

  const supabase = getSupabase()

  // 전체 목록 모드
  if (mode === 'list' || !query) {
    let listQuery = supabase
      .from('memories')
      .select('id, division_id, category, content, tags, confidence, source, times_referenced, times_ignored, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (category) listQuery = listQuery.eq('category', category)
    if (tags) listQuery = listQuery.overlaps('tags', tags)

    const { data, error } = await listQuery
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ memories: data ?? [], searchType: 'list' })
  }

  // 벡터 검색
  const embedding = await generateEmbedding(query)
  if (embedding) {
    const { data, error } = await supabase.rpc('search_memories', {
      query_embedding: `[${embedding.join(',')}]`,
      match_threshold: 0.5,
      match_count: limit,
      filter_tags: tags,
      filter_category: category,
    })

    if (!error && data && data.length > 0) {
      return NextResponse.json({ memories: data, searchType: 'vector' })
    }
  }

  // 텍스트 검색 fallback
  const { data, error } = await supabase.rpc('search_memories_text', {
    p_query: query,
    p_match_count: limit,
    p_filter_tags: tags,
    p_filter_category: category,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ memories: data || [], searchType: 'text' })
}

// ──────────────────────────────────────
// PATCH: Update memory
// ──────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const { id, content, category, tags, confidence } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다' }, { status: 400 })
  }

  const supabase = getSupabase()

  // 업데이트할 필드만 구성
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (content !== undefined) updates.content = content
  if (category !== undefined) updates.category = category
  if (tags !== undefined) updates.tags = tags
  if (confidence !== undefined) updates.confidence = confidence

  // content가 변경되면 임베딩 재생성
  if (content) {
    const embedding = await generateEmbedding(content)
    if (embedding) {
      updates.embedding = `[${embedding.join(',')}]`
    }
  }

  const { data, error } = await supabase
    .from('memories')
    .update(updates)
    .eq('id', id)
    .select('id, content, category, tags, confidence, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ memory: data })
}

// ──────────────────────────────────────
// DELETE: Remove memory
// ──────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id 쿼리 파라미터가 필요합니다' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: id })
}
