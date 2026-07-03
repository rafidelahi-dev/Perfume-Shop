'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAdminBlogCategories, useAdminCreateCategory, useAdminDeleteCategory } from '@/lib/queries/blog'

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function AdminBlogCategoriesPage() {
  const { data: categories = [], isLoading } = useAdminBlogCategories()
  const createMutation = useAdminCreateCategory()
  const deleteMutation = useAdminDeleteCategory()

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Blog Categories</h1>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          required value={name} onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Category name"
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

      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-400 font-mono">{c.slug}</p>
            </div>
            <button
              onClick={() => {
                if (confirm(`Delete "${c.name}"?`)) deleteMutation.mutate(c.id)
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {!isLoading && categories.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No categories yet.</p>
        )}
      </div>
    </div>
  )
}
