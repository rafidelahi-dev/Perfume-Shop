'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAdminBlogTags, useAdminCreateTag, useAdminDeleteTag } from '@/lib/queries/blog'

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function AdminBlogTagsPage() {
  const { data: tags = [], isLoading } = useAdminBlogTags()
  const createMutation = useAdminCreateTag()
  const deleteMutation = useAdminDeleteTag()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  function handleNameChange(v: string) {
    setName(v)
    if (!slug || slug === toSlug(name)) setSlug(toSlug(v))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await createMutation.mutateAsync({ name, slug })
    setName('')
    setSlug('')
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Blog Tags</h1>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          required value={name} onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Tag name"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
        />
        <input
          required value={slug} onChange={(e) => setSlug(e.target.value)}
          placeholder="slug"
          className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
        />
        <button
          type="submit" disabled={createMutation.isPending}
          className="bg-[#d4af37] text-[#1a1a1a] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#c4a030] disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}

      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <div key={t.id} className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1.5">
            <span className="text-sm text-gray-700">#{t.name}</span>
            <button
              onClick={() => {
                if (confirm(`Delete "#${t.name}"?`)) deleteMutation.mutate(t.id)
              }}
              className="ml-1 text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {!isLoading && tags.length === 0 && (
          <p className="text-gray-400 text-sm py-8">No tags yet.</p>
        )}
      </div>
    </div>
  )
}
