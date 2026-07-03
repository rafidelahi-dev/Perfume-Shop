'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useDashboardBlogPosts, useDashboardDeleteBlogPost, useDashboardUpdateBlogPost } from '@/lib/queries/blog'
import BlogStatusBadge from '@/components/blog/BlogStatusBadge'

export default function DashboardBlogPage() {
  const { data: posts = [], isLoading } = useDashboardBlogPosts()
  const deleteMutation = useDashboardDeleteBlogPost()
  const updateMutation = useDashboardUpdateBlogPost()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Blog Posts</h1>
        <Link
          href="/dashboard/blog/new"
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Post
        </Link>
      </div>

      {isLoading && <div className="text-center py-20 text-gray-400">Loading…</div>}

      {!isLoading && posts.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="mb-4">You haven&apos;t written any posts yet.</p>
          <Link href="/dashboard/blog/new" className="underline text-gray-600 hover:text-gray-900">
            Write your first article
          </Link>
        </div>
      )}

      {!isLoading && posts.length > 0 && (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <BlogStatusBadge status={post.status} />
                  <span className="text-xs text-gray-400">
                    {new Date(post.created_at).toLocaleDateString('en-BD')}
                  </span>
                </div>
                {post.status === 'rejected' && post.rejection_note && (
                  <p className="text-xs text-red-600 mt-1">Rejection note: {post.rejection_note}</p>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                {['draft', 'rejected'].includes(post.status) && (
                  <>
                    <Link
                      href={`/dashboard/blog/${post.id}/edit`}
                      className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                    >
                      Edit
                    </Link>
                    {post.status !== 'pending_review' && (
                      <button
                        onClick={() => updateMutation.mutate({ id: post.id, action: 'submit' })}
                        disabled={updateMutation.isPending}
                        className="px-2.5 py-1 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg disabled:opacity-60"
                      >
                        Submit
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Delete this post?')) deleteMutation.mutate(post.id)
                      }}
                      className="px-2.5 py-1 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg"
                    >
                      Delete
                    </button>
                  </>
                )}
                {post.status === 'pending_review' && (
                  <span className="text-xs text-amber-600">Under review</span>
                )}
                {post.status === 'published' && (
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer"
                    className="text-xs text-[#d4af37] underline">View</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
