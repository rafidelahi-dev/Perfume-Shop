import { jsonLd } from "@/lib/jsonLd";
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogPostCard from '@/components/blog/BlogPostCard';
import SimilarPerfumeCard from '@/components/perfume/SimilarPerfumeCard';
import DemandRequestButtons from '@/components/perfume/DemandRequestButtons';
import PerfumeGallery from '@/components/perfume/PerfumeGallery';
import { AtAGlance, BestFor } from '@/components/perfume/AtAGlance';
import { buildGlance } from '@/lib/glance';
import FeedbackSection from '@/components/reviews/FeedbackSection';
import {
  createPublicSupabase,
  fetchPerfumeBySlug,
  fetchSimilarPerfumes,
  fetchPerfumeReviewAggregate,
  fetchPerfumeReviews,
  fetchPerfumeTrend,
  type PerfumeProfile,
} from '@/lib/queries/perfumes';

export const dynamic = 'force-dynamic';

const SITE_URL = 'https://www.cloudperfumebd.com';
const MIN_REVIEWS_FOR_SCHEMA = 3;

type Props = { params: Promise<{ slug: string }> };

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

  const [listings, relatedPosts, similarPerfumes, aggregate, reviews, trend] = await Promise.all([
    fetchListings(perfume),
    fetchRelatedPosts(perfume),
    fetchSimilarPerfumes(perfume),
    fetchPerfumeReviewAggregate(perfume.id),
    fetchPerfumeReviews(perfume.id),
    fetchPerfumeTrend(perfume.id),
  ]);

  const prices = listings.map(effectivePrice).filter(Number.isFinite);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;
  const highPrice = prices.length > 0 ? Math.max(...prices) : null;
  const glance = buildGlance(aggregate, lowPrice, trend);

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: perfume.name,
    brand: { '@type': 'Brand', name: perfume.brand },
    description: perfume.meta_description ?? undefined,
    ...(perfume.images && perfume.images.length > 0 && { image: perfume.images }),
    ...(listings.length > 0 && {
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'BDT',
        offerCount: listings.length,
        availability: 'https://schema.org/InStock',
        ...(lowPrice !== null && { lowPrice: lowPrice.toFixed(2) }),
        ...(highPrice !== null && { highPrice: highPrice.toFixed(2) }),
      },
    }),
    ...(listings.length === 0 && {
      offers: {
        '@type': 'Offer',
        priceCurrency: 'BDT',
        availability: 'https://schema.org/OutOfStock',
      },
    }),
    ...(aggregate.review_count >= MIN_REVIEWS_FOR_SCHEMA && aggregate.rating_avg != null && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: aggregate.rating_avg.toFixed(1),
        ratingCount: aggregate.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Fragrances', item: `${SITE_URL}/fragrances` },
      { '@type': 'ListItem', position: 3, name: perfume.name, item: `${SITE_URL}/fragrance/${perfume.slug}` },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Is ${perfume.name} available in Bangladesh?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            listings.length > 0
              ? `Yes, ${perfume.name} by ${perfume.brand} is currently available from ${listings.length} verified seller${listings.length > 1 ? 's' : ''} on Cloud PerfumeBD.`
              : `${perfume.name} by ${perfume.brand} has no active listings right now, but you can check back as sellers list new stock.`,
        },
      },
      {
        '@type': 'Question',
        name: `Can I buy a decant of ${perfume.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes, sellers on Cloud PerfumeBD offer ${perfume.name} as full bottles, partials, and decants in smaller sizes, so you can try it before committing to a full bottle.`,
        },
      },
      ...(lowPrice !== null
        ? [
            {
              '@type': 'Question',
              name: `What is the price of ${perfume.name} in Bangladesh?`,
              acceptedAnswer: {
                '@type': 'Answer',
                text:
                  highPrice !== null && highPrice !== lowPrice
                    ? `${perfume.name} decant and bottle prices on Cloud PerfumeBD currently range from TK${lowPrice.toFixed(0)} to TK${highPrice.toFixed(0)}, depending on size and seller.`
                    : `${perfume.name} is currently listed from TK${lowPrice.toFixed(0)} on Cloud PerfumeBD.`,
              },
            },
          ]
        : []),
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }}
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

        <div className="mb-8 grid items-start gap-6 md:grid-cols-2">
          <PerfumeGallery images={perfume.images ?? []} name={perfume.name} />
          <AtAGlance glance={glance} accords={perfume.accords} />
        </div>

        <BestFor glance={glance} />

        <section className="mb-12 rounded-2xl border border-black/5 bg-white p-6">
          <h2 className="text-lg font-serif font-semibold text-[#1a1a1a] mb-4">Note Pyramid</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <NoteTier label="Top Notes" notes={perfume.top_notes} />
            <NoteTier label="Heart Notes" notes={perfume.heart_notes} />
            <NoteTier label="Base Notes" notes={perfume.base_notes} />
          </div>
        </section>

        <div className="mb-12 rounded-2xl border border-black/5 bg-white p-6">
          <FeedbackSection
            perfumeId={perfume.id}
            slug={perfume.slug}
            perfumeName={perfume.name}
            initialAggregate={aggregate}
            initialReviews={reviews}
          />
        </div>

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <p className="text-gray-500 font-light">
              No listings yet — check back soon as more sellers join.
            </p>
            <DemandRequestButtons perfumeId={perfume.id} />
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

        {(perfume.authenticity_batch_code || perfume.authenticity_packaging_notes || perfume.authenticity_other_notes) && (
          <section className="mt-12 rounded-2xl border border-black/5 bg-white p-6">
            <h2 className="text-lg font-serif font-semibold text-[#1a1a1a] mb-4">
              How to Spot a Fake {perfume.name}
            </h2>
            <div className="space-y-3 text-sm text-gray-600">
              {perfume.authenticity_batch_code && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Batch Code</p>
                  <p>{perfume.authenticity_batch_code}</p>
                </div>
              )}
              {perfume.authenticity_packaging_notes && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Cap &amp; Box Print</p>
                  <p>{perfume.authenticity_packaging_notes}</p>
                </div>
              )}
              {perfume.authenticity_other_notes && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Other Signs</p>
                  <p>{perfume.authenticity_other_notes}</p>
                </div>
              )}
            </div>
          </section>
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
