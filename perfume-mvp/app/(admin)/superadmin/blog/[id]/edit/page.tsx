'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  useAdminBlogCategories, useAdminBlogTags,
  useAdminUpdateBlogPost, useAdminDeleteBlogPost,
  type BlogPost,
} from '@/lib/queries/blog'
import CoverImageUpload from '@/components/blog/CoverImageUpload'
import BlogStatusBadge from '@/components/blog/BlogStatusBadge'

const BlogEditor = dynamic(() => import('@/components/blog/BlogEditor'), { ssr: false })

type Params = { params: Promise<{ id: string }> }

export default function AdminEditBlogPage({ params }: Params) {
  const router = useRouter()
  const [id, setId] = useState<string>('')
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)

  const updateMutation = useAdminUpdateBlogPost()
  const deleteMutation = useAdminDeleteBlogPost()
  const { data: categories = [] } = useAdminBlogCategories()
  const { data: tags = [] } = useAdminBlogTags()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [rejectionNote, setRejectionNote] = useState('')

  useEffect(() => {
    params.then(({ id }) => {
      setId(id)
      fetch(`/api/admin/blog/posts/${id}`)
        .then((r) => r.json())
        .then((data: BlogPost) => {
          setPost(data)
          setTitle(data.title)
          setSlug(data.slug)
          setExcerpt(data.excerpt)
          setContent(data.content)
          setCoverUrl(data.cover_image_url)
          setSelectedCats(
            (data as any).blog_post_categories?.map((c: any) => c.blog_categories?.id).filter(Boolean) ?? []
          )
          setSelectedTags(
            (data as any).blog_post_tags?.map((t: any) => t.blog_tags?.id).filter(Boolean) ?? []
          )
          setLoading(false)
        })
    })
  }, [params])

  function toggleCat(cid: string) {
    setSelectedCats((prev) => prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid])
  }
  function toggleTag(tid: string) {
    setSelectedTags((prev) => prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid])
  }

  async function save(overrides: Record<string, unknown> = {}) {
    await updateMutation.mutateAsync({
      id,
      title, slug, excerpt, content,
      cover_image_url: coverUrl,
      category_ids: selectedCats,
      tag_ids: selectedTags,
      ...overrides,
    })
    router.push('/superadmin/blog')
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (!post) return <div className="text-center py-20 text-red-500">Post not found.</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Edit Post</h1>
          <BlogStatusBadge status={post.status} />
        </div>
        <div className="flex items-center gap-2">
          {post.status === 'pending_review' && (
            <>
              <button
                onClick={() => save({ status: 'published', rejection_note: null })}
                disabled={updateMutation.isPending}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={async () => {
                  const note = window.prompt('Rejection reason (optional)')
                  await save({ status: 'rejected', rejection_note: note ?? '' })
                }}
                disabled={updateMutation.isPending}
                className="bg-red-100 text-red-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-200 disabled:opacity-60"
              >
                Reject
              </button>
            </>
          )}
          <button
            onClick={() => save()}
            disabled={updateMutation.isPending}
            className="bg-[#d4af37] text-[#1a1a1a] px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#c4a030] disabled:opacity-60"
          >
            {updateMutation.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this post?')) {
                deleteMutation.mutate(id, { onSuccess: () => router.push('/superadmin/blog') })
              }
            }}
            className="px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-semibold hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      </div>

      {post.status === 'rejected' && post.rejection_note && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          <strong>Rejection note:</strong> {post.rejection_note}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#d4af37]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
          <textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] resize-none" />
        </div>

        <CoverImageUpload value={coverUrl} onChange={setCoverUrl} postId={id} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <BlogEditor content={content} onChange={setContent} postId={id} />
        </div>

        {categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.id} type="button" onClick={() => toggleCat(c.id)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${selectedCats.includes(c.id) ? 'bg-[#d4af37] text-[#1a1a1a] border-[#d4af37]' : 'border-gray-300 text-gray-600'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${selectedTags.includes(t.id) ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-300 text-gray-600'}`}>
                  #{t.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
