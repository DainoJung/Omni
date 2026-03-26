'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Brain, Search, Plus, Trash2, Pencil, X, Check, RefreshCcw,
  Building2, AlertTriangle, BookOpen, Settings, Tag, Loader2,
  ChevronDown, ChevronUp, Save,
} from 'lucide-react'

// ── Types ──

interface Memory {
  id: string
  division_id: string | null
  category: string
  content: string
  tags: string[]
  confidence: number
  source: string | null
  times_referenced: number
  times_ignored: number
  created_at: string
  updated_at: string
}

const CATEGORIES = ['architecture', 'failure', 'domain', 'operations'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_META: Record<string, { label: string; icon: typeof Brain; color: string }> = {
  architecture: { label: 'Architecture', icon: Building2, color: 'var(--accent-blue)' },
  failure: { label: 'Failures', icon: AlertTriangle, color: 'var(--accent-yellow)' },
  domain: { label: 'Domain', icon: BookOpen, color: 'var(--accent-green)' },
  operations: { label: 'Operations', icon: Settings, color: 'var(--accent-purple)' },
}

// ── Main Component ──

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchMemories = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ mode: 'list', limit: '100' })
      if (filterCategory) params.set('category', filterCategory)
      if (searchQuery.trim()) {
        params.delete('mode')
        params.set('q', searchQuery.trim())
      }
      const res = await fetch(`/api/memory?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setMemories(data.memories || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [filterCategory, searchQuery])

  useEffect(() => {
    const timer = setTimeout(fetchMemories, searchQuery ? 400 : 0)
    return () => clearTimeout(timer)
  }, [fetchMemories, searchQuery])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-[var(--accent-purple)]" />
          <div>
            <h2 className="text-2xl font-bold">Institutional Memory</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-0.5">
              운영에서 배운 구조화된 지식 — {memories.length}건
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchMemories}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setShowAddForm(!showAddForm); setEditingId(null) }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[var(--accent-purple)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            추가
          </button>
        </div>
      </header>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="메모리 검색... (벡터 + 텍스트)"
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-purple)] transition-colors"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-purple)] transition-colors"
        >
          <option value="">전체 카테고리</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{CATEGORY_META[cat]?.label || cat}</option>
          ))}
        </select>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <MemoryForm
          onSave={async () => { setShowAddForm(false); await fetchMemories() }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Memory List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          로딩 중...
        </div>
      ) : memories.length === 0 ? (
        <div className="p-8 text-center bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
          <Brain className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-[var(--text-secondary)]">
            {searchQuery ? '검색 결과가 없습니다' : '아직 저장된 기억이 없습니다'}
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {searchQuery ? '다른 키워드로 검색하거나 카테고리를 변경해보세요' : '"추가" 버튼으로 수동 교훈을 기록하거나, Division 운영 시 자동으로 축적됩니다'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {memories.map(m => (
            editingId === m.id ? (
              <MemoryForm
                key={m.id}
                initial={m}
                onSave={async () => { setEditingId(null); await fetchMemories() }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <MemoryCard
                key={m.id}
                memory={m}
                onEdit={() => { setEditingId(m.id); setShowAddForm(false) }}
                onDelete={async () => {
                  if (!confirm('이 메모리를 삭제하시겠습니까?')) return
                  await fetch(`/api/memory?id=${m.id}`, { method: 'DELETE' })
                  await fetchMemories()
                }}
              />
            )
          ))}
        </div>
      )}
    </div>
  )
}

// ── Memory Card ──

function MemoryCard({ memory, onEdit, onDelete }: { memory: Memory; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const meta = CATEGORY_META[memory.category]
  const Icon = meta?.icon || Brain

  return (
    <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg group">
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: `color-mix(in srgb, ${meta?.color || 'var(--text-muted)'} 15%, transparent)` }}
        >
          <Icon className="w-4 h-4" style={{ color: meta?.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${expanded ? '' : 'line-clamp-2'}`}>{memory.content}</p>

          {/* Tags */}
          {memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {memory.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded text-[10px] text-[var(--text-muted)]">
                  <Tag className="w-2.5 h-2.5" />{tag}
                </span>
              ))}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
            <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)]">{memory.category}</span>
            <span>확신도 {(memory.confidence * 100).toFixed(0)}%</span>
            <span>참조 {memory.times_referenced}회</span>
            {memory.source && <span>출처: {memory.source}</span>}
            {memory.content.length > 150 && (
              <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-0.5 hover:text-[var(--text-secondary)]">
                {expanded ? <><ChevronUp className="w-3 h-3" />접기</> : <><ChevronDown className="w-3 h-3" />펼치기</>}
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-blue)] rounded transition-colors" title="수정">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-red)] rounded transition-colors" title="삭제">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Memory Form (Add / Edit) ──

function MemoryForm({ initial, onSave, onCancel }: {
  initial?: Memory
  onSave: () => Promise<void>
  onCancel: () => void
}) {
  const isEdit = !!initial
  const [content, setContent] = useState(initial?.content || '')
  const [category, setCategory] = useState<string>(initial?.category || 'operations')
  const [tagsInput, setTagsInput] = useState(initial?.tags.join(', ') || '')
  const [confidence, setConfidence] = useState(initial?.confidence ?? 0.5)
  const [source, setSource] = useState(initial?.source || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!content.trim()) return
    setSaving(true)
    setError(null)

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)

    try {
      if (isEdit) {
        const res = await fetch('/api/memory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: initial.id,
            content: content.trim(),
            category,
            tags,
            confidence,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || '수정 실패')
        }
      } else {
        const res = await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content.trim(),
            category,
            tags,
            confidence,
            source: source.trim() || undefined,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || '저장 실패')
        }
      }
      await onSave()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 bg-[var(--bg-secondary)] border-2 border-[var(--accent-purple)]/30 rounded-lg space-y-3">
      <h4 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
        {isEdit ? '메모리 수정' : '새 메모리 추가'}
      </h4>

      {/* Content */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="교훈, 패턴, 주의사항 등 기록할 내용..."
        rows={3}
        className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm resize-none focus:outline-none focus:border-[var(--accent-purple)] transition-colors"
        autoFocus
      />

      {/* Category + Confidence */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] text-[var(--text-muted)] mb-1">카테고리</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-2 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs focus:outline-none focus:border-[var(--accent-purple)]"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_META[cat]?.label || cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-[var(--text-muted)] mb-1">
            확신도: {(confidence * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={confidence}
            onChange={e => setConfidence(parseFloat(e.target.value))}
            className="w-full accent-[var(--accent-purple)]"
          />
        </div>
        <div>
          <label className="block text-[10px] text-[var(--text-muted)] mb-1">태그 (쉼표 구분)</label>
          <input
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="build, cost, api"
            className="w-full px-2 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs focus:outline-none focus:border-[var(--accent-purple)]"
          />
        </div>
        {!isEdit && (
          <div>
            <label className="block text-[10px] text-[var(--text-muted)] mb-1">출처</label>
            <input
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="e.g. division-builder, 수동"
              className="w-full px-2 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs focus:outline-none focus:border-[var(--accent-purple)]"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="px-3 py-1.5 bg-[var(--accent-red)]/10 text-[var(--accent-red)] text-xs rounded">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent-purple)] text-white rounded-md hover:opacity-90 disabled:opacity-30 transition-opacity"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isEdit ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {isEdit ? '수정 저장' : '저장'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          취소
        </button>
      </div>
    </div>
  )
}
