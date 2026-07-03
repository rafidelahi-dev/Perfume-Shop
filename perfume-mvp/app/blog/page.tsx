import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BlogPostCard from '@/components/blog/BlogPostCard'
import Link from 'next/link'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Fragrance Blog — Guides & Reviews for Bangladesh',
  description: 'Fragrance guides, reviews, and news from the Cloud PerfumeBD community.',
  alternates: { canonical: 'https://www.cloudperfumebd.com/blog' },
}

function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type SearchParams = Promise<{ category?: string; tag?: string }>

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const { category, tag } = await searchParams
  const supabase = publicClient()

  const [postsResult, catsResult, tagsResult] = await Promise.all([
    supabase
      .from('blog_posts')
      .select(`
        id, slug, title, excerpt, cover_image_url, published_at,
        blog_post_categories(blog_categories(id, name, slug)),
        blog_post_tags(blog_tags(id, name, slug))
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
    supabase.from('blog_categories').select('id, name, slug').order('name'),
    supabase.from('blog_tags').select('id, name, slug').order('name'),
  ])

  const posts: any[] = postsResult.data ?? []
  const categories: any[] = catsResult.data ?? []
  const tags: any[] = tagsResult.data ?? []

  // Client-side filter by category/tag slug (simple approach for SSG+ISR)
  const filtered = posts.filter((p: any) => {
    if (category) {
      const cats = p.blog_post_categories?.map((c: any) => c.blog_categories?.slug) ?? []
      if (!cats.includes(category)) return false
    }
    if (tag) {
      const tgs = p.blog_post_tags?.map((t: any) => t.blog_tags?.slug) ?? []
      if (!tgs.includes(tag)) return false
    }
    return true
  })

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#fdfbf7] pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-2">Journal</p>
            <h1 className="text-4xl font-serif font-bold text-[#1a1a1a]">Fragrance Blog</h1>
          </div>

          {/* Filters */}
          {(categories.length > 0 || tags.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-8">
              <Link
                href="/blog"
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${!category && !tag ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'border-gray-300 text-gray-600 hover:border-[#d4af37]'}`}
              >
                All
              </Link>
              {(categories as any[]).map((c) => (
                <Link
                  key={c.id}
                  href={`/blog?category=${c.slug}`}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${category === c.slug ? 'bg-[#d4af37] text-[#1a1a1a] border-[#d4af37]' : 'border-gray-300 text-gray-600 hover:border-[#d4af37]'}`}
                >
                  {c.name}
                </Link>
              ))}
              {(tags as any[]).map((t) => (
                <Link
                  key={t.id}
                  href={`/blog?tag=${t.slug}`}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${tag === t.slug ? 'bg-[#1a1a1a]/10 text-[#1a1a1a] border-[#1a1a1a]/30' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}
                >
                  #{t.name}
                </Link>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <p className="text-lg font-light">No articles yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((post: any) => {
                const cat = post.blog_post_categories?.[0]?.blog_categories?.name ?? null
                return (
                  <BlogPostCard
                    key={post.id}
                    slug={post.slug}
                    title={post.title}
                    excerpt={post.excerpt}
                    cover_image_url={post.cover_image_url}
                    published_at={post.published_at}
                    category={cat}
                  />
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
