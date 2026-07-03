import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { fragranceCatalog } from '@/lib/fragrance-catalog'

export const metadata: Metadata = {
  title: 'Fragrance Directory — Prices & Decants in Bangladesh',
  description:
    'Browse every fragrance tracked on Cloud PerfumeBD. Compare decant and bottle prices from sellers across Bangladesh, brand by brand.',
  alternates: { canonical: 'https://www.cloudperfumebd.com/fragrances' },
}

export default function FragranceDirectoryPage() {
  // Group catalog by brand, alphabetical
  const byBrand = new Map<string, typeof fragranceCatalog>()
  for (const entry of fragranceCatalog) {
    const list = byBrand.get(entry.brand) ?? []
    list.push(entry)
    byBrand.set(entry.brand, list)
  }
  const brands = [...byBrand.keys()].sort((a, b) => a.localeCompare(b))

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#fdfbf7] pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <p className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-2">
              Directory
            </p>
            <h1 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-3">
              Fragrance Directory
            </h1>
            <p className="text-gray-500 max-w-2xl">
              {fragranceCatalog.length} fragrances tracked across {brands.length} brands.
              Each page shows live listings and the cheapest decants available in Bangladesh.
            </p>
          </div>

          <div className="space-y-10">
            {brands.map((brand) => (
              <section key={brand}>
                <h2 className="text-xl font-serif font-semibold text-[#1a1a1a] mb-4 border-b border-black/5 pb-2">
                  {brand}
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                  {byBrand.get(brand)!.map((entry) => (
                    <li key={entry.slug}>
                      <Link
                        href={`/fragrance/${entry.slug}`}
                        className="text-sm text-gray-600 hover:text-[#d4af37] transition-colors"
                      >
                        {entry.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
