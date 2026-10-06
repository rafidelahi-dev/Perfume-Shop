'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'

export type DirectoryEntry = { slug: string; name: string; brand: string }

export default function DirectoryList({ entries }: { entries: DirectoryEntry[] }) {
  const [q, setQ] = useState('')

  const { brands, byBrand, count } = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const matches = needle
      ? entries.filter((e) => `${e.brand} ${e.name}`.toLowerCase().includes(needle))
      : entries
    const map = new Map<string, DirectoryEntry[]>()
    for (const e of matches) {
      const list = map.get(e.brand) ?? []
      list.push(e)
      map.set(e.brand, list)
    }
    return {
      byBrand: map,
      brands: [...map.keys()].sort((a, b) => a.localeCompare(b)),
      count: matches.length,
    }
  }, [entries, q])

  return (
    <>
      <div className="relative mb-10 max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/30" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search fragrance or brand…"
          aria-label="Search fragrances"
          className="w-full rounded-2xl border border-black/10 bg-white px-12 py-3 outline-none ring-2 ring-transparent transition focus:border-[#d4af37] focus:ring-[#d4af37]/20 [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-black/40 hover:bg-black/5 hover:text-black/70"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {q.trim() && (
        <p className="mb-6 text-sm text-gray-500" aria-live="polite">
          {count} {count === 1 ? 'result' : 'results'} for “{q.trim()}”
        </p>
      )}

      {count === 0 ? (
        <div className="py-12 text-center">
          <p className="font-serif text-2xl text-[#1a1a1a]">No fragrance found</p>
          <p className="mt-2 text-gray-500">Check the spelling, or try just the brand name.</p>
        </div>
      ) : (
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
      )}
    </>
  )
}
