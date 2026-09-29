'use client'

import { useState } from 'react'
import { Search, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import {
  useAdminPerfumes,
  useAdminUpdatePerfume,
  useAdminCreatePerfume,
  useAdminDeletePerfume,
  type AdminPerfume,
} from '@/lib/queries/adminPerfumes'
import { ActionModal } from '@/components/admin/ActionModal'

function arrayToText(arr: string[]): string {
  return arr.join(', ')
}

function textToArray(text: string): string[] {
  return text.split(',').map((s) => s.trim()).filter(Boolean)
}

function NewPerfumeForm() {
  const create = useAdminCreatePerfume()
  const [open, setOpen] = useState(false)
  const [brand, setBrand] = useState('')
  const [name, setName] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [searchTerms, setSearchTerms] = useState('')

  function reset() {
    setBrand('')
    setName('')
    setMetaTitle('')
    setMetaDescription('')
    setSearchTerms('')
  }

  function submit() {
    if (!brand.trim() || !name.trim()) return
    create.mutate(
      {
        brand: brand.trim(),
        name: name.trim(),
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        search_terms: textToArray(searchTerms),
      },
      { onSuccess: () => { reset(); setOpen(false) } },
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Plus className="w-4 h-4 text-[#d4af37]" />
          Add new perfume
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <label className="text-xs text-gray-500">
              Brand *
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-gray-500">
              Name *
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lattafa Khamrah Qahwa"
                className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
              />
            </label>
          </div>
          <label className="text-xs text-gray-500 block mb-3">
            Meta title (SEO)
            <input
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-gray-500 block mb-3">
            Meta description (SEO)
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-gray-500 block mb-4">
            Search terms (comma-separated)
            <input
              value={searchTerms}
              onChange={(e) => setSearchTerms(e.target.value)}
              placeholder="e.g. khamrah qahwa, lattafa coffee perfume"
              className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
            />
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Notes, accords, and authenticity fields can be filled in after creation, below.
          </p>
          <button
            onClick={submit}
            disabled={!brand.trim() || !name.trim() || create.isPending}
            className="px-4 py-2 text-xs font-medium bg-[#d4af37] hover:bg-[#c4a030] text-[#1a1a1a] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {create.isPending ? 'Creating…' : 'Create perfume'}
          </button>
        </div>
      )}
    </div>
  )
}

function PerfumeRow({ perfume }: { perfume: AdminPerfume }) {
  const update = useAdminUpdatePerfume()
  const deletePerfume = useAdminDeletePerfume()
  const [showDelete, setShowDelete] = useState(false)

  const [slug, setSlug] = useState(perfume.slug)
  const [name, setName] = useState(perfume.name)
  const [brand, setBrand] = useState(perfume.brand)
  const [metaTitle, setMetaTitle] = useState(perfume.meta_title ?? '')
  const [metaDescription, setMetaDescription] = useState(perfume.meta_description ?? '')
  const [searchTerms, setSearchTerms] = useState(arrayToText(perfume.search_terms))
  const [topNotes, setTopNotes] = useState(arrayToText(perfume.top_notes))
  const [heartNotes, setHeartNotes] = useState(arrayToText(perfume.heart_notes))
  const [baseNotes, setBaseNotes] = useState(arrayToText(perfume.base_notes))
  const [accords, setAccords] = useState(arrayToText(perfume.accords))
  const [description, setDescription] = useState(perfume.house_description ?? '')
  const [batchCode, setBatchCode] = useState(perfume.authenticity_batch_code ?? '')
  const [packagingNotes, setPackagingNotes] = useState(perfume.authenticity_packaging_notes ?? '')
  const [otherNotes, setOtherNotes] = useState(perfume.authenticity_other_notes ?? '')

  function save(extra: Partial<{ is_verified: boolean }> = {}) {
    update.mutate({
      id: perfume.id,
      slug,
      name,
      brand,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      search_terms: textToArray(searchTerms),
      top_notes: textToArray(topNotes),
      heart_notes: textToArray(heartNotes),
      base_notes: textToArray(baseNotes),
      accords: textToArray(accords),
      house_description: description,
      authenticity_batch_code: batchCode,
      authenticity_packaging_notes: packagingNotes,
      authenticity_other_notes: otherNotes,
      ...extra,
    })
  }

  return (
    <div className="border-b border-gray-100 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            perfume.is_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {perfume.is_verified ? 'Verified' : 'Unverified'}
        </span>
        <button
          onClick={() => setShowDelete(true)}
          className="px-2.5 py-1 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <label className="text-xs text-gray-500">
          Brand
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-medium"
          />
        </label>
        <label className="text-xs text-gray-500">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm font-medium"
          />
        </label>
        <label className="text-xs text-gray-500">
          Slug
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
        </label>
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

      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">SEO</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <label className="text-xs text-gray-500">
          Meta title
          <input
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Search terms (comma-separated)
          <input
            value={searchTerms}
            onChange={(e) => setSearchTerms(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
        </label>
      </div>
      <label className="text-xs text-gray-500 block mb-3">
        Meta description
        <textarea
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
        />
      </label>

      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        Authenticity guide (fake-spotting)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <label className="text-xs text-gray-500">
          Batch code
          <input
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
            placeholder="e.g. where to find it, format"
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Cap / box print notes
          <input
            value={packagingNotes}
            onChange={(e) => setPackagingNotes(e.target.value)}
            placeholder="e.g. cap texture, box print quality"
            className="mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
          />
        </label>
      </div>
      <label className="text-xs text-gray-500 block mb-3">
        Other authenticity notes
        <textarea
          value={otherNotes}
          onChange={(e) => setOtherNotes(e.target.value)}
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

      {showDelete && (
        <ActionModal
          title="Delete perfume"
          description={`This permanently deletes "${perfume.name}" and its price history and demand-request signals. This cannot be undone. If any seller listings still reference it, deletion will be blocked.`}
          confirmLabel="Delete perfume"
          onConfirm={() => deletePerfume.mutate(perfume.id, { onSuccess: () => setShowDelete(false) })}
          onClose={() => setShowDelete(false)}
        />
      )}
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

      <NewPerfumeForm />

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
