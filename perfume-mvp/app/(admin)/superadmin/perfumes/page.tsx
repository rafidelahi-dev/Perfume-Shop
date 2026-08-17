'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { useAdminPerfumes, useAdminUpdatePerfume, type AdminPerfume } from '@/lib/queries/adminPerfumes'

function arrayToText(arr: string[]): string {
  return arr.join(', ')
}

function textToArray(text: string): string[] {
  return text.split(',').map((s) => s.trim()).filter(Boolean)
}

function PerfumeRow({ perfume }: { perfume: AdminPerfume }) {
  const update = useAdminUpdatePerfume()
  const [topNotes, setTopNotes] = useState(arrayToText(perfume.top_notes))
  const [heartNotes, setHeartNotes] = useState(arrayToText(perfume.heart_notes))
  const [baseNotes, setBaseNotes] = useState(arrayToText(perfume.base_notes))
  const [accords, setAccords] = useState(arrayToText(perfume.accords))
  const [description, setDescription] = useState(perfume.house_description ?? '')

  function save(extra: Partial<{ is_verified: boolean }> = {}) {
    update.mutate({
      id: perfume.id,
      top_notes: textToArray(topNotes),
      heart_notes: textToArray(heartNotes),
      base_notes: textToArray(baseNotes),
      accords: textToArray(accords),
      house_description: description,
      ...extra,
    })
  }

  return (
    <div className="border-b border-gray-100 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#d4af37]">{perfume.brand}</p>
          <p className="text-sm font-medium text-gray-900">{perfume.name}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            perfume.is_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {perfume.is_verified ? 'Verified' : 'Unverified'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <label className="text-xs text-gray-500">
          Top notes
          <input
            value={topNotes}
            onChange={(e) => setTopNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Heart notes
          <input
            value={heartNotes}
            onChange={(e) => setHeartNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Base notes
          <input
            value={baseNotes}
            onChange={(e) => setBaseNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Accords
          <input
            value={accords}
            onChange={(e) => setAccords(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
        </label>
      </div>
      <label className="text-xs text-gray-500 block mb-3">
        House description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
        />
      </label>

      <div className="flex gap-2">
        <button
          onClick={() => save()}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
        >
          Save
        </button>
        {!perfume.is_verified && (
          <button
            onClick={() => save({ is_verified: true })}
            className="px-3 py-1.5 text-xs font-medium bg-[#d4af37] hover:bg-[#c4a030] text-[#1a1a1a] rounded-lg"
          >
            Save & Verify
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminPerfumesPage() {
  const { data: perfumes = [], isLoading } = useAdminPerfumes()
  const [search, setSearch] = useState('')

  const filtered = perfumes.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Perfumes</h1>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or brand…"
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
        />
      </div>

      {isLoading && <div className="text-center py-20 text-gray-400">Loading…</div>}

      {!isLoading && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filtered.map((perfume) => (
            <PerfumeRow key={perfume.id} perfume={perfume} />
          ))}
        </div>
      )}
    </div>
  )
}
