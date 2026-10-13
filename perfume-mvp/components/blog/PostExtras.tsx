'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createPublicSupabase } from '@/lib/queries/perfumes'
import type { FaqItem } from '@/lib/blogPostExtras'

type Props = {
  faq: FaqItem[]
  onFaqChange: (v: FaqItem[]) => void
  fragranceSlugs: string[]
  onFragranceSlugsChange: (v: string[]) => void
  internalNotes: string
  onInternalNotesChange: (v: string) => void
}

type PerfumeOption = { slug: string; name: string; brand: string }

const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400'

export default function PostExtras({
  faq, onFaqChange, fragranceSlugs, onFragranceSlugsChange, internalNotes, onInternalNotesChange,
}: Props) {
  const [options, setOptions] = useState<PerfumeOption[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    createPublicSupabase()
      .from('perfumes')
      .select('slug, name, brand')
      .order('name')
      .then(({ data }) => setOptions((data ?? []) as PerfumeOption[]))
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return options
      .filter((o) => !fragranceSlugs.includes(o.slug) && `${o.brand} ${o.name}`.toLowerCase().includes(q))
      .slice(0, 6)
  }, [options, query, fragranceSlugs])

  const labelFor = (slug: string) => {
    const o = options.find((x) => x.slug === slug)
    return o ? `${o.brand} ${o.name}` : slug
  }

  function updateFaq(i: number, patch: Partial<FaqItem>) {
    onFaqChange(faq.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
  }

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-700">Featured fragrances</legend>
        <p className="text-xs text-gray-400">
          Shown under the article with live prices from sellers and a link to each fragrance page (max 10).
        </p>
        <div className="flex flex-wrap gap-2">
          {fragranceSlugs.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onFragranceSlugsChange(fragranceSlugs.filter((x) => x !== s))}
              className="rounded-full bg-gray-800 px-3 py-1 text-xs text-white"
              title="Remove"
            >
              {labelFor(s)} ×
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fragrance to add…"
            className={input}
          />
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
              {matches.map((o) => (
                <li key={o.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      if (fragranceSlugs.length < 10) onFragranceSlugsChange([...fragranceSlugs, o.slug])
                      setQuery('')
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    {o.brand} {o.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-700">FAQ</legend>
        <p className="text-xs text-gray-400">
          Shown at the end of the article and added as FAQ structured data. Rows with an empty question or answer are dropped.
        </p>
        {faq.map((f, i) => (
          <div key={i} className="space-y-2 rounded-lg bg-gray-50 p-3">
            <div className="flex gap-2">
              <input
                value={f.q}
                onChange={(e) => updateFaq(i, { q: e.target.value })}
                placeholder="Question"
                className={input}
              />
              <button
                type="button"
                onClick={() => onFaqChange(faq.filter((_, idx) => idx !== i))}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-red-600"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <textarea
              rows={2}
              value={f.a}
              onChange={(e) => updateFaq(i, { a: e.target.value })}
              placeholder="Answer"
              className={`${input} resize-none`}
            />
          </div>
        ))}
        {faq.length < 20 && (
          <button
            type="button"
            onClick={() => onFaqChange([...faq, { q: '', a: '' }])}
            className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <Plus className="h-4 w-4" /> Add question
          </button>
        )}
      </fieldset>

      <fieldset className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <legend className="px-1 text-sm font-semibold text-amber-900">Internal fact-check notes (never published)</legend>
        <textarea
          rows={5}
          value={internalNotes}
          onChange={(e) => onInternalNotesChange(e.target.value)}
          placeholder="Claim, source (video + timestamp), confidence. Unverified items to cut before publishing."
          className={`${input} resize-y`}
        />
      </fieldset>
    </div>
  )
}
