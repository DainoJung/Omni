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

// POST: Save memory with auto-embedding
export async function POST(request: NextRequest) {
  const { divisionId, category, content, tags, confidence, source } = await request.json()
  const supabase = getSupabase()

  const embedding = await generateEmbedding(content)

  const { data, error } = await supabase
    .from('memories')
    .insert({
      division_id: divisionId || null,
      category: category || 'operations',
      content,
      tags: tags || [],
      confidence: confidence || 0.5,
      source: source || null,
      embedding: embedding ? `[${embedding.join(',')}]` : null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, hasEmbedding: !!embedding })
}

// GET: Search memories (vector or text fallback)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category')
  const tagsParam = searchParams.get('tags')
  const limit = parseInt(searchParams.get('limit') || '10')
  const tags = tagsParam ? tagsParam.split(',') : null

  const supabase = getSupabase()

  // Try vector search
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

  // Fallback: text search
  const { data, error } = await supabase.rpc('search_memories_text', {
    p_query: query,
    p_match_count: limit,
    p_filter_tags: tags,
    p_filter_category: category,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ memories: data || [], searchType: 'text' })
}
