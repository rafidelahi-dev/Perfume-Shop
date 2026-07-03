import { createClient } from '@supabase/supabase-js'
import BlogPostCard from '@/components/blog/BlogPostCard'
import Link from 'next/link'

export const revalidate = 3600

async function fetchLatestPosts() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('blog_posts')
    .select(`
      id, slug, title, excerpt, cover_image_url, published_at,
      blog_post_categories(blog_categories(name, slug))
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(3)
  return data ?? []
}

export default async function LatestArticles() {
  const posts = await fetchLatestPosts()
  if (posts.length === 0) return null

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#fdfbf7]">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-2">Journal</p>
            <h2 className="text-3xl font-serif font-bold text-[#1a1a1a]">Latest Articles</h2>
          </div>
          <Link href="/blog" className="text-sm font-medium text-gray-500 hover:text-[#1a1a1a] underline underline-offset-2">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post: any) => {
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
      </div>
    </section>
  )
}
