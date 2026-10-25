'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'

export type DirectoryEntry = { slug: string; name: string; brand: string; image: string | null }

/** Fades and lifts its child in the first time it scrolls into view. */
function Reveal({ children, delay = 0, as: Tag = 'li' }: { children: React.ReactNode; delay?: number; as?: 'li' | 'section' }) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
      className={`transition-[opacity,transform] duration-500 ease-out ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      {children}
    </Tag>
  )
}

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
            <Reveal as="section" key={brand}>
              <h2 className="text-xl font-serif font-semibold text-[#1a1a1a] mb-4 border-b border-black/5 pb-2">
                {brand}
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-3">
                {byBrand.get(brand)!.map((entry, i) => (
                  <Reveal key={entry.slug} delay={(i % 4) * 60}>
                    <Link
                      href={`/fragrance/${entry.slug}`}
                      className="group flex items-center gap-3 text-sm text-gray-600 hover:text-[#d4af37] transition-colors"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
                        {entry.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.image}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-contain p-0.5 transition-transform group-hover:scale-105"
                          />
                        )}
                      </span>
                      <span className="leading-snug">{entry.name}</span>
                    </Link>
                  </Reveal>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      )}
    </>
  )
}
