'use client'

import { useState, useId } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAdminBlogCategories, useAdminBlogTags, useDashboardCreateBlogPost } from '@/lib/queries/blog'
import CoverImageUpload from '@/components/blog/CoverImageUpload'

const BlogEditor = dynamic(() => import('@/components/blog/BlogEditor'), { ssr: false })

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function DashboardNewBlogPage() {
  const router = useRouter()
  const postId = useId().replace(/:/g, '')
  const createMutation = useDashboardCreateBlogPost()

  const { data: categories = [] } = useAdminBlogCategories()
  const { data: tags = [] } = useAdminBlogTags()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  function handleTitleChange(v: string) {
    setTitle(v)
    if (!slug || slug === toSlug(title)) setSlug(toSlug(v))
  }

  function toggleCat(id: string) {
    setSelectedCats((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  function toggleTag(id: string) {
    setSelectedTags((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createMutation.mutateAsync({
      title, slug, excerpt, content,
      cover_image_url: coverUrl,
      category_ids: selectedCats,
      tag_ids: selectedTags,
    })
    router.push('/dashboard/blog')
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">New Article</h1>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 disabled:opacity-60"
        >
          {createMutation.isPending ? 'Saving…' : 'Save Draft'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input required value={title} onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <input required value={slug} onChange={(e) => setSlug(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
          <textarea required rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none" />
        </div>

        <CoverImageUpload value={coverUrl} onChange={setCoverUrl} postId={postId} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <BlogEditor content={content} onChange={setContent} postId={postId} />
        </div>

        {categories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.id} type="button" onClick={() => toggleCat(c.id)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${selectedCats.includes(c.id) ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600'}`}>
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
    </form>
  )
}
