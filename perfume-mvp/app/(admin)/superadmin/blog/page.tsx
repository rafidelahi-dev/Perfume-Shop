'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, ExternalLink } from 'lucide-react'
import { useAdminBlogPosts, useAdminDeleteBlogPost, type BlogPostStatus } from '@/lib/queries/blog'
import BlogStatusBadge from '@/components/blog/BlogStatusBadge'

const STATUS_OPTIONS: { value: 'all' | BlogPostStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'draft', label: 'Draft' },
  { value: 'rejected', label: 'Rejected' },
]

export default function AdminBlogPage() {
  const { data: posts = [], isLoading } = useAdminBlogPosts()
  const deleteMutation = useAdminDeleteBlogPost()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | BlogPostStatus>('all')

  const filtered = posts.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.title.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
        <Link
          href="/superadmin/blog/new"
          className="flex items-center gap-2 bg-[#d4af37] text-[#1a1a1a] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#c4a030] transition-colors"
        >
          <Plus className="w-4 h-4" /> New Post
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex gap-2">
          <Link href="/superadmin/blog/categories" className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Categories</Link>
          <Link href="/superadmin/blog/tags" className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Tags</Link>
        </div>
      </div>

      {isLoading && <div className="text-center py-20 text-gray-400">Loading…</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">No posts match your filters.</div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[2fr_120px_100px_140px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Post</span>
            <span>Author</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {filtered.map((post) => (
            <div key={post.id} className="grid grid-cols-[2fr_120px_100px_140px] gap-4 px-6 py-4 items-center border-b border-gray-100 hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900 line-clamp-1">{post.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(post.created_at).toLocaleDateString('en-BD')}
                </p>
              </div>
              <p className="text-xs text-gray-600">{(post as any).profiles?.display_name ?? '—'}</p>
              <BlogStatusBadge status={post.status} />
              <div className="flex items-center gap-2">
                <Link
                  href={`/superadmin/blog/${post.id}/edit`}
                  className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                >
                  Edit
                </Link>
                {post.status === 'published' && (
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer"
                    className="p-1.5 text-gray-400 hover:text-gray-700">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => {
                    if (confirm('Delete this post?')) deleteMutation.mutate(post.id)
                  }}
                  className="px-2.5 py-1 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
