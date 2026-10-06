import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import DirectoryList, { type DirectoryEntry } from './DirectoryList'
import { createPublicSupabase } from '@/lib/queries/perfumes'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Fragrance Directory — Prices & Decants in Bangladesh',
  description:
    'Browse every fragrance tracked on Cloud PerfumeBD. Compare decant and bottle prices from sellers across Bangladesh, brand by brand.',
  alternates: { canonical: 'https://www.cloudperfumebd.com/fragrances' },
}

async function fetchDirectoryEntries(): Promise<DirectoryEntry[]> {
  const supabase = createPublicSupabase()
  const { data, error } = await supabase
    .from('perfumes')
    .select('slug, name, brand')
    .order('brand', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('[FragranceDirectory] fetch failed:', error.message)
    return []
  }
  return data ?? []
}

export default async function FragranceDirectoryPage() {
  const entries = await fetchDirectoryEntries()

  const brandCount = new Set(entries.map((e) => e.brand)).size

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
              {entries.length} fragrances tracked across {brandCount} brands.
              Each page shows live listings and the cheapest decants available in Bangladesh.
            </p>
          </div>

          <DirectoryList entries={entries} />
        </div>
      </main>
      <Footer />
    </>
  )
}
