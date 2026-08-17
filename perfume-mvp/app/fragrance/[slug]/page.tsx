import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostCard from '@/components/blog/BlogPostCard';
import SimilarPerfumeCard from '@/components/perfume/SimilarPerfumeCard';
import {
  createPublicSupabase,
  fetchAllPerfumeSlugs,
  fetchPerfumeBySlug,
  fetchSimilarPerfumes,
  fetchPerfumeReviewAggregate,
  type PerfumeProfile,
} from '@/lib/queries/perfumes';

export const revalidate = 3600;

const SITE_URL = 'https://www.cloudperfumebd.com';
const MIN_REVIEWS_FOR_CHART = 3;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await fetchAllPerfumeSlugs();
  return slugs.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const perfume = await fetchPerfumeBySlug(slug);
  if (!perfume) return { title: 'Not Found' };

  const title = perfume.name.startsWith(perfume.brand)
    ? `${perfume.name} in Bangladesh`
    : `${perfume.brand} ${perfume.name} in Bangladesh`;
  const description =
    perfume.meta_description ??
    `${perfume.name} in Bangladesh — compare decant prices from verified sellers.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/fragrance/${perfume.slug}` },
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
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
  blog_post_tags: { blog_tags: { name: string; slug: string } | null }[]
}

async function fetchRelatedPosts(perfume: PerfumeProfile): Promise<RelatedPost[]> {
  const supabase = createPublicSupabase();
  const terms = [perfume.name.toLowerCase(), perfume.brand.toLowerCase()];

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
    const catSlugs = p.blog_post_categories?.map((c) => c.blog_categories?.slug ?? '').filter(Boolean) ?? [];
    const tagSlugs = p.blog_post_tags?.map((t) => t.blog_tags?.slug ?? '').filter(Boolean) ?? [];
    const all = [...catSlugs, ...tagSlugs];
    return terms.some((term) => all.some((s) => s.includes(term) || term.includes(s)));
  }).slice(0, 2);
}

async function fetchListings(perfume: PerfumeProfile): Promise<FragranceListing[]> {
  const supabase = createPublicSupabase();
  const terms = perfume.search_terms.length > 0 ? perfume.search_terms : [perfume.name];
  const filter = terms.map((t) => `perfume_name.ilike.%${t}%`).join(',');
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

const LONGEVITY_ORDER = ['0-2h', '2-5h', '5-7h', '7-10h', '10h+'] as const;
const GENDER_ORDER = ['very_masculine', 'masculine', 'unisex', 'feminine', 'very_feminine'] as const;
const GENDER_LABELS: Record<string, string> = {
  very_masculine: 'Very Masc.',
  masculine: 'Masculine',
  unisex: 'Unisex',
  feminine: 'Feminine',
  very_feminine: 'Very Fem.',
};
const OCCASION_ORDER = ['Winter', 'Spring', 'Summer', 'Fall', 'Day', 'Night'] as const;

function DistributionBar({
  counts,
  order,
  labels,
  total,
}: {
  counts: Record<string, number>;
  order: readonly string[];
  labels?: Record<string, string>;
  total: number;
}) {
  return (
    <div className="space-y-2">
      {order.map((key) => {
        const count = counts[key] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={key} className="flex items-center gap-3 text-xs">
            <span className="w-16 shrink-0 text-gray-500">{labels?.[key] ?? key}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-[#d4af37]" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right text-gray-400">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function NoteTier({ label, notes }: { label: string; notes: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-gray-400 mb-1.5">{label}</p>
      {notes.length > 0 ? (
        <p className="text-sm text-[#1a1a1a] capitalize">{notes.join(', ')}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">Not yet documented</p>
      )}
    </div>
  );
}

export default async function FragrancePage({ params }: Props) {
  const { slug } = await params;
  const perfume = await fetchPerfumeBySlug(slug);
  if (!perfume) notFound();

  const [listings, relatedPosts, similarPerfumes, aggregate] = await Promise.all([
    fetchListings(perfume),
    fetchRelatedPosts(perfume),
    fetchSimilarPerfumes(perfume),
    fetchPerfumeReviewAggregate(perfume.id),
  ]);

  const hasEnoughReviews = aggregate.review_count >= MIN_REVIEWS_FOR_CHART;

  const prices = listings.map(effectivePrice).filter(Number.isFinite);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;
  const highPrice = prices.length > 0 ? Math.max(...prices) : null;

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: perfume.name,
    brand: { '@type': 'Brand', name: perfume.brand },
    description: perfume.meta_description ?? undefined,
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
            {perfume.brand}
          </p>
          <h1 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-2">
            {perfume.name} Decants in Bangladesh
          </h1>
          <p className="text-gray-500 text-sm">
            Find the cheapest {perfume.name} decants from verified sellers across Bangladesh.
          </p>
          {perfume.house_description && (
            <p className="text-gray-600 text-sm mt-3 max-w-2xl">{perfume.house_description}</p>
          )}
        </div>

        <section className="mb-12 rounded-2xl border border-black/5 bg-white p-6">
          <h2 className="text-lg font-serif font-semibold text-[#1a1a1a] mb-4">Note Pyramid</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <NoteTier label="Top Notes" notes={perfume.top_notes} />
            <NoteTier label="Heart Notes" notes={perfume.heart_notes} />
            <NoteTier label="Base Notes" notes={perfume.base_notes} />
          </div>
        </section>

        <section className="mb-12 rounded-2xl border border-black/5 bg-white p-6">
          <h2 className="text-lg font-serif font-semibold text-[#1a1a1a] mb-4">Community Read</h2>
          {hasEnoughReviews ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Longevity</p>
                <DistributionBar
                  counts={aggregate.longevity_counts}
                  order={LONGEVITY_ORDER}
                  total={aggregate.review_count}
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Gender Lean</p>
                <DistributionBar
                  counts={aggregate.gender_counts}
                  order={GENDER_ORDER}
                  labels={GENDER_LABELS}
                  total={aggregate.review_count}
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Best Worn</p>
                <DistributionBar
                  counts={aggregate.occasion_counts}
                  order={OCCASION_ORDER}
                  total={aggregate.review_count}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Not enough reviews yet.</p>
          )}
        </section>

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

        {similarPerfumes.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-serif font-semibold text-[#1a1a1a] mb-6">Similar Perfumes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {similarPerfumes.map((p) => (
                <SimilarPerfumeCard key={p.id} slug={p.slug} name={p.name} brand={p.brand} accords={p.accords} />
              ))}
            </div>
          </div>
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
