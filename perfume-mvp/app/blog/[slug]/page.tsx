import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import NextImage from 'next/image'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TiptapLink from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import BlogPostCard from '@/components/blog/BlogPostCard'
import type { FaqItem } from '@/lib/blogPostExtras'

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
    .select('title, excerpt, meta_title, meta_description, cover_image_url, published_at, updated_at, profiles(display_name)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!data) return { title: 'Not Found' }

  const seoTitle = data.meta_title?.trim() || data.title
  const seoDescription = data.meta_description?.trim() || data.excerpt
  const isBangla = /[ঀ-৿]/.test(`${data.title} ${seoDescription}`)
  const authorName = (data.profiles as unknown as { display_name: string | null } | null)?.display_name

  return {
    title: seoTitle,
    description: seoDescription,
    alternates: { canonical: `${SITE_URL}/blog/${slug}` },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      type: 'article',
      locale: isBangla ? 'bn_BD' : 'en_US',
      ...(data.published_at && { publishedTime: data.published_at }),
      ...(data.updated_at && { modifiedTime: data.updated_at }),
      ...(authorName && { authors: [authorName] }),
      ...(data.cover_image_url && { images: [{ url: data.cover_image_url }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      ...(data.cover_image_url && { images: [data.cover_image_url] }),
    },
  }
}

type Sb = ReturnType<typeof publicClient>

async function fetchFeatured(supabase: Sb, slugs: string[]) {
  if (slugs.length === 0) return []
  const { data: perfumes } = await supabase
    .from('perfumes')
    .select('slug, name, brand, search_terms')
    .in('slug', slugs)
  if (!perfumes) return []
  const rows = await Promise.all(
    perfumes.map(async (p: any) => {
      const terms: string[] = p.search_terms?.length ? p.search_terms : [p.name]
      const { data } = await supabase
        .from('listings')
        .select('price, min_price, type')
        .or(terms.map((t) => `perfume_name.ilike.%${t}%`).join(','))
        .eq('is_hidden', false)
        .limit(50)
      const prices = (data ?? [])
        .map((l: any) => Number(l.type === 'decant' ? l.min_price : l.price))
        .filter((n) => Number.isFinite(n) && n > 0)
      return { slug: p.slug as string, name: p.name as string, brand: p.brand as string, count: prices.length, lowest: prices.length ? Math.min(...prices) : 0 }
    })
  )
  return slugs.map((s) => rows.find((r) => r.slug === s)).filter((r): r is NonNullable<typeof r> => !!r)
}

type RelatedPost = {
  slug: string; title: string; excerpt: string; cover_image_url: string | null; published_at: string | null
}

async function fetchRelated(
  supabase: Sb, id: string, catSlugs: string[], tagSlugs: string[], fragSlugs: string[]
): Promise<RelatedPost[]> {
  const { data } = await supabase
    .from('blog_posts')
    .select(`
      id, slug, title, excerpt, cover_image_url, published_at, fragrance_slugs,
      blog_post_categories(blog_categories(slug)),
      blog_post_tags(blog_tags(slug))
    `)
    .eq('status', 'published')
    .neq('id', id)
    .order('published_at', { ascending: false })
    .limit(50)
  const scored = ((data ?? []) as any[]).map((p) => {
    const pc: string[] = (p.blog_post_categories ?? []).map((c: any) => c.blog_categories?.slug)
    const pt: string[] = (p.blog_post_tags ?? []).map((t: any) => t.blog_tags?.slug)
    const pf: string[] = p.fragrance_slugs ?? []
    const score =
      pf.filter((s) => fragSlugs.includes(s)).length * 3 +
      pt.filter((s) => tagSlugs.includes(s)).length * 2 +
      pc.filter((s) => catSlugs.includes(s)).length
    return { p: p as RelatedPost, score }
  })
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.p)
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const supabase = publicClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select(`
      id, slug, title, excerpt, meta_title, meta_description, faq, fragrance_slugs, content, cover_image_url, published_at, updated_at,
      profiles(display_name, username, bio),
      blog_post_categories(blog_categories(name, slug)),
      blog_post_tags(blog_tags(name, slug))
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) notFound()

  const html = renderToHTMLString({
    content: post.content as any,
    extensions: [StarterKit, Image, TiptapLink, Underline, Table, TableRow, TableHeader, TableCell],
  })

  const plainText = html.replace(/<[^>]+>/g, ' ')
  const readMinutes = Math.max(1, Math.round(plainText.split(/\s+/).filter(Boolean).length / 200))
  const articleLang = /[ঀ-৿]/.test(`${post.title} ${plainText}`) ? 'bn' : 'en'

  const categories: { name: string; slug: string }[] =
    (post as any).blog_post_categories?.map((c: any) => c.blog_categories).filter(Boolean) ?? []
  const tags: { name: string; slug: string }[] =
    (post as any).blog_post_tags?.map((t: any) => t.blog_tags).filter(Boolean) ?? []
  const author = (post as any).profiles
  const faq: FaqItem[] = Array.isArray((post as any).faq) ? (post as any).faq : []
  const fragranceSlugs: string[] = (post as any).fragrance_slugs ?? []
  const [featured, related] = await Promise.all([
    fetchFeatured(supabase, fragranceSlugs),
    fetchRelated(supabase, post.id, categories.map((c) => c.slug), tags.map((t) => t.slug), fragranceSlugs),
  ])
  const updatedAt = (post as any).updated_at as string | null
  const showUpdated =
    !!updatedAt && !!post.published_at &&
    new Date(updatedAt).getTime() - new Date(post.published_at).getTime() > 24 * 3600 * 1000

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description?.trim() || post.excerpt,
    inLanguage: articleLang,
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

  const faqSchema = faq.length > 0 && {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <Header />
      <main className="min-h-screen bg-[#fdfbf7] pt-24 pb-20">
        <article lang={articleLang} className="mx-auto max-w-3xl px-4 sm:px-6">
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
              <span>·</span>
              <span>{readMinutes} min read</span>
            </div>
            {showUpdated && updatedAt && (
              <p className="mt-2 text-xs text-gray-400">
                Last updated{' '}
                <time dateTime={updatedAt}>
                  {new Date(updatedAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                </time>
              </p>
            )}
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
            className="prose prose-gray max-w-none prose-headings:font-serif prose-a:text-[#d4af37] prose-img:rounded-xl prose-table:w-full prose-th:border prose-th:border-gray-200 prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-gray-200 prose-td:px-3 prose-td:py-2"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* FAQ */}
          {faq.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-4 font-serif text-2xl font-bold text-[#1a1a1a]">FAQ</h2>
              <div className="space-y-3">
                {faq.map((f, i) => (
                  <details key={i} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <summary className="cursor-pointer font-medium text-[#1a1a1a]">{f.q}</summary>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Featured fragrances */}
          {featured.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-4 font-serif text-2xl font-bold text-[#1a1a1a]">Featured fragrances</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {featured.map((f) => (
                  <a key={f.slug} href={`/fragrance/${f.slug}`}
                    className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-[#d4af37]">
                    <p className="text-xs uppercase tracking-widest text-gray-400">{f.brand}</p>
                    <p className="font-serif font-semibold text-[#1a1a1a]">{f.name}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {f.count > 0
                        ? `${f.count} listing${f.count > 1 ? 's' : ''} from ৳${f.lowest.toLocaleString('en-BD')}`
                        : 'No active listings'}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          )}

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

          {/* Author */}
          {author?.display_name && (
            <aside className="mt-12 rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-xs uppercase tracking-widest text-gray-400">Written by</p>
              <p className="font-serif text-lg font-semibold text-[#1a1a1a]">
                {author.username ? (
                  <a href={`/perfumes/${author.username}`} className="hover:underline">{author.display_name}</a>
                ) : author.display_name}
              </p>
              {author.bio && <p className="mt-1 text-sm text-gray-600">{author.bio}</p>}
            </aside>
          )}
        </article>

        {related.length > 0 && (
          <section className="mx-auto mt-14 max-w-5xl px-4 sm:px-6">
            <h2 className="mb-4 font-serif text-2xl font-bold text-[#1a1a1a]">Related posts</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <BlogPostCard key={r.slug} slug={r.slug} title={r.title} excerpt={r.excerpt}
                  cover_image_url={r.cover_image_url} published_at={r.published_at} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
