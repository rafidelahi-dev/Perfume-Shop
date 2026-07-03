import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import NextImage from 'next/image'
import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TiptapLink from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'

export const revalidate = 3600

const SITE_URL = 'https://www.cloudperfumebd.com'

function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = publicClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('title, excerpt, cover_image_url, published_at, updated_at, profiles(display_name)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!data) return { title: 'Not Found' }

  const authorName = (data.profiles as unknown as { display_name: string | null } | null)?.display_name

  return {
    title: data.title,
    description: data.excerpt,
    alternates: { canonical: `${SITE_URL}/blog/${slug}` },
    openGraph: {
      title: data.title,
      description: data.excerpt,
      type: 'article',
      ...(data.published_at && { publishedTime: data.published_at }),
      ...(data.updated_at && { modifiedTime: data.updated_at }),
      ...(authorName && { authors: [authorName] }),
      ...(data.cover_image_url && { images: [{ url: data.cover_image_url }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: data.excerpt,
      ...(data.cover_image_url && { images: [data.cover_image_url] }),
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const supabase = publicClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select(`
      id, slug, title, excerpt, content, cover_image_url, published_at, updated_at,
      profiles(display_name, username),
      blog_post_categories(blog_categories(name, slug)),
      blog_post_tags(blog_tags(name, slug))
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) notFound()

  const html = generateHTML(post.content as any, [StarterKit, Image, TiptapLink, Underline])

  const categories: { name: string; slug: string }[] =
    (post as any).blog_post_categories?.map((c: any) => c.blog_categories).filter(Boolean) ?? []
  const tags: { name: string; slug: string }[] =
    (post as any).blog_post_tags?.map((t: any) => t.blog_tags).filter(Boolean) ?? []
  const author = (post as any).profiles

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    ...(post.cover_image_url && { image: [post.cover_image_url] }),
    ...(post.published_at && { datePublished: post.published_at }),
    ...((post as any).updated_at && { dateModified: (post as any).updated_at }),
    author: {
      '@type': 'Person',
      name: author?.display_name ?? 'Cloud PerfumeBD',
      ...(author?.username && { url: `${SITE_URL}/perfumes/${author.username}` }),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Cloud PerfumeBD',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    ...(categories.length > 0 && { articleSection: categories.map((c) => c.name) }),
    ...(tags.length > 0 && { keywords: tags.map((t) => t.name).join(', ') }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <Header />
      <main className="min-h-screen bg-[#fdfbf7] pt-24 pb-20">
        <article className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Meta */}
          <div className="mb-6">
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {categories.map((c) => (
                  <a key={c.slug} href={`/blog?category=${c.slug}`}
                    className="text-xs font-semibold uppercase tracking-widest text-[#d4af37] hover:underline">
                    {c.name}
                  </a>
                ))}
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1a1a1a] leading-tight mb-4">
              {post.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {author?.display_name && <span>By {author.display_name}</span>}
              {post.published_at && (
                <>
                  {author?.display_name && <span>·</span>}
                  <time dateTime={post.published_at}>
                    {new Date(post.published_at).toLocaleDateString('en-BD', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </time>
                </>
              )}
            </div>
          </div>

          {/* Cover */}
          {post.cover_image_url && (
            <div className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden mb-8">
              <NextImage
                src={post.cover_image_url}
                alt={post.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-gray max-w-none prose-headings:font-serif prose-a:text-[#d4af37] prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {tags.map((t) => (
                <a key={t.slug} href={`/blog?tag=${t.slug}`}
                  className="px-3 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-600 hover:border-[#d4af37] transition-colors">
                  #{t.name}
                </a>
              ))}
            </div>
          )}
        </article>
      </main>
      <Footer />
    </>
  )
}
