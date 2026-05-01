import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import { fragranceCatalog, getCatalogEntry } from '@/lib/fragrance-catalog';
import type { PerfumeCatalogEntry } from '@/lib/fragrance-catalog';

export const revalidate = 3600;

const SITE_URL = 'https://cloudperfumebd.com';

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

  // Avoid doubling the brand: "Dior Sauvage" is the name, brand is "Dior"
  // Using just the name avoids "Dior Dior Sauvage in Bangladesh"
  const title = `${entry.name} in Bangladesh | CloudPerfumeBD`;
  return {
    title,
    description: entry.metaDescription,
    alternates: { canonical: `${SITE_URL}/fragrance/${entry.slug}` },
    openGraph: {
      title,
      description: entry.metaDescription,
      type: 'website',
    },
  };
}

type FragranceListing = {
  id: string;
  perfume_name: string | null;
  price: number | null;
  min_price: number | null;
  type: string | null;
  decant_options: { ml: number; price: number }[] | null;
  profiles: { display_name: string | null; username: string } | null;
};

function effectivePrice(listing: FragranceListing): number {
  if ((listing.type ?? '').toLowerCase() === 'decant' && listing.min_price != null) {
    return Number(listing.min_price);
  }
  return Number(listing.price ?? NaN);
}

async function fetchListings(entry: PerfumeCatalogEntry): Promise<FragranceListing[]> {
  const supabase = createPublicSupabase();
  const filter = entry.searchTerms.map((t) => `perfume_name.ilike.%${t}%`).join(',');
  const { data } = await supabase
    .from('listings')
    .select('id, perfume_name, price, min_price, type, decant_options, profiles(display_name, username)')
    .or(filter)
    .eq('is_hidden', false)
    .order('price', { ascending: true })
    .limit(20);

  return (data ?? []) as unknown as FragranceListing[];
}

export default async function FragrancePage({ params }: Props) {
  const { slug } = await params;
  const entry = getCatalogEntry(slug);
  if (!entry) notFound();

  const listings = await fetchListings(entry);

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
      </main>
    </div>
  );
}
