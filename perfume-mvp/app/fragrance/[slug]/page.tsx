import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { fragranceCatalog, getCatalogEntry } from '@/lib/fragrance-catalog';
import type { PerfumeCatalogEntry } from '@/lib/fragrance-catalog';
import BlogPostCard from '@/components/blog/BlogPostCard';

export const revalidate = 3600;

const SITE_URL = 'https://www.cloudperfumebd.com';

function createPublicSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return fragranceCatalog.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getCatalogEntry(slug);
  if (!entry) return { title: 'Not Found' };

  // Include brand only if name doesn't already start with it
  const title = entry.name.startsWith(entry.brand)
    ? `${entry.name} in Bangladesh`
    : `${entry.brand} ${entry.name} in Bangladesh`;
  return {
    title,
    description: entry.metaDescription,
    alternates: { canonical: `${SITE_URL}/fragrance/${entry.slug}` },
    openGraph: {
      title,
      description: entry.metaDescription,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: entry.metaDescription,
    },
  };
}

type FragranceListing = {
  id: string;
  perfume_name: string | null;
  price: number | null;
  min_price: number | null;
  type: string | null;
  profiles: { display_name: string | null; username: string } | null;
};

function effectivePrice(listing: FragranceListing): number {
  if ((listing.type ?? '').toLowerCase() === 'decant' && listing.min_price != null) {
    return Number(listing.min_price);
  }
  return Number(listing.price ?? NaN);
}

type RelatedPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  cover_image_url: string | null
  published_at: string | null
  blog_post_categories: { blog_categories: { name: string; slug: string } | null }[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blog_post_tags: any[]
}

async function fetchRelatedPosts(entry: PerfumeCatalogEntry): Promise<RelatedPost[]> {
  const supabase = createPublicSupabase();
  const terms = [entry.name.toLowerCase(), entry.brand.toLowerCase()];

  const { data: posts } = await supabase
    .from('blog_posts')
    .select(`
      id, slug, title, excerpt, cover_image_url, published_at,
      blog_post_categories(blog_categories(name, slug)),
      blog_post_tags(blog_tags(name, slug))
    `)
    .eq('status', 'published')
    .limit(20);

  if (!posts) return [];

  return (posts as unknown as RelatedPost[]).filter((p) => {
    const catSlugs: string[] = p.blog_post_categories?.map((c: any) => c.blog_categories?.slug ?? '').filter(Boolean) ?? [];
    const tagSlugs: string[] = p.blog_post_tags?.map((t: any) => t.blog_tags?.slug ?? '').filter(Boolean) ?? [];
    const all = [...catSlugs, ...tagSlugs];
    return terms.some((term) => all.some((s) => s.includes(term) || term.includes(s)));
  }).slice(0, 2);
}

async function fetchListings(entry: PerfumeCatalogEntry): Promise<FragranceListing[]> {
  const supabase = createPublicSupabase();
  const filter = entry.searchTerms.map((t) => `perfume_name.ilike.%${t}%`).join(',');
  const { data, error } = await supabase
    .from('listings')
    .select('id, perfume_name, price, min_price, type, profiles!inner(display_name, username)')
    .or(filter)
    .eq('is_hidden', false)
    .order('price', { ascending: true })
    .limit(20);

  if (error) {
    console.error('[FragrancePage] fetchListings failed:', error.message);
    return [];
  }
  return ((data ?? []) as unknown as FragranceListing[]).sort(
    (a, b) => effectivePrice(a) - effectivePrice(b)
  );
}

export default async function FragrancePage({ params }: Props) {
  const { slug } = await params;
  const entry = getCatalogEntry(slug);
  if (!entry) notFound();

  const [listings, relatedPosts] = await Promise.all([
    fetchListings(entry),
    fetchRelatedPosts(entry),
  ]);

  const prices = listings.map(effectivePrice).filter(Number.isFinite);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;
  const highPrice = prices.length > 0 ? Math.max(...prices) : null;

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: entry.name,
    brand: { '@type': 'Brand', name: entry.brand },
    description: entry.metaDescription,
    ...(listings.length > 0 && {
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'BDT',
        offerCount: listings.length,
        ...(lowPrice !== null && { lowPrice: lowPrice.toFixed(2) }),
        ...(highPrice !== null && { highPrice: highPrice.toFixed(2) }),
      },
    }),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-24">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-1">
            {entry.brand}
          </p>
          <h1 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-2">
            {entry.name} Decants in Bangladesh
          </h1>
          <p className="text-gray-500 text-sm">
            Find the cheapest {entry.name} decants from verified sellers across Bangladesh.
          </p>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <p className="text-gray-500 font-light">
              No listings yet — check back soon as more sellers join.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => {
              const price = effectivePrice(listing);
              const seller = listing.profiles;
              if (!seller?.username) return null;
              return (
                <li key={listing.id}>
                  <Link
                    href={`/perfumes/${seller.username}/${listing.id}`}
                    className="block rounded-2xl border border-black/5 bg-white p-4 shadow-sm hover:shadow-md hover:border-[#d4af37]/30 transition-all"
                  >
                    <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
                      {listing.type ?? 'listing'}
                    </p>
                    <p className="font-serif font-semibold text-[#1a1a1a] mb-2">
                      {listing.perfume_name}
                    </p>
                    <p className="text-xl font-bold text-[#d4af37]">
                      {Number.isFinite(price) ? `TK${price.toFixed(0)}` : 'Price on Contact'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      by {seller.display_name ?? seller.username}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {relatedPosts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-serif font-semibold text-[#1a1a1a] mb-6">Related Reading</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPosts.map((post) => {
                const cat = post.blog_post_categories?.[0]?.blog_categories?.name ?? null;
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
                );
              })}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
