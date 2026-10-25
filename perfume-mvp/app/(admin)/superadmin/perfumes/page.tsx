'use client'

import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { Search, Plus, ChevronDown, ChevronUp, Maximize2, Minimize2, ImageOff, BadgeCheck, Trash2 } from 'lucide-react'
import {
  useAdminPerfumes,
  useAdminUpdatePerfume,
  useAdminCreatePerfume,
  useAdminDeletePerfume,
  type AdminPerfume,
} from '@/lib/queries/adminPerfumes'
import { uploadAdminPerfumeImages } from '@/lib/queries/adminPerfumes'
import { ActionModal } from '@/components/admin/ActionModal'
import { toast } from 'sonner'

function arrayToText(arr: string[]): string {
  return arr.join(', ')
}

function textToArray(text: string): string[] {
  return text.split(',').map((s) => s.trim()).filter(Boolean)
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  const cls = 'mt-1 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm'
  return (
    <label className="text-xs text-gray-500 block">
      {label}
      {rows ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={cls} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </label>
  )
}

function ImagePicker({ urls, onChange }: { urls: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false)

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    try {
      const added = await uploadAdminPerfumeImages(files)
      onChange([...urls, ...added])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mb-3">
      <p className="text-xs text-gray-500 mb-1">Images (PNG/JPEG/WebP/AVIF, photos are auto-resized; first is the main image)</p>
      <div className="flex flex-wrap gap-2 items-center">
        {urls.map((u, i) => (
          <div key={u} className="relative w-20 h-20 rounded-lg border border-gray-200 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(urls.filter((_, j) => j !== i))}
              className="absolute top-0.5 right-0.5 w-5 h-5 text-xs leading-none rounded-full bg-black/70 text-white"
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        ))}
        <label className="w-20 h-20 flex items-center justify-center text-center text-xs text-gray-500 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:bg-gray-50">
          {uploading ? 'Uploading…' : '+ Add'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            multiple
            disabled={uploading}
            onChange={onFiles}
            className="hidden"
          />
        </label>
      </div>
    </div>
  )
}

const EMPTY_NEW = {
  brand: '',
  name: '',
  topNotes: '',
  heartNotes: '',
  baseNotes: '',
  accords: '',
  description: '',
  metaTitle: '',
  metaDescription: '',
  searchTerms: '',
  batchCode: '',
  packagingNotes: '',
  otherNotes: '',
}

function NewPerfumeForm() {
  const create = useAdminCreatePerfume()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(EMPTY_NEW)
  const [images, setImages] = useState<string[]>([])
  const set = (k: keyof typeof EMPTY_NEW) => (v: string) => setF((p) => ({ ...p, [k]: v }))

  function submit() {
    if (!f.brand.trim() || !f.name.trim()) return
    create.mutate(
      {
        brand: f.brand.trim(),
        name: f.name.trim(),
        top_notes: textToArray(f.topNotes),
        heart_notes: textToArray(f.heartNotes),
        base_notes: textToArray(f.baseNotes),
        accords: textToArray(f.accords),
        house_description: f.description || null,
        meta_title: f.metaTitle || null,
        meta_description: f.metaDescription || null,
        search_terms: textToArray(f.searchTerms),
        authenticity_batch_code: f.batchCode || null,
        authenticity_packaging_notes: f.packagingNotes || null,
        authenticity_other_notes: f.otherNotes || null,
        images,
      },
      { onSuccess: () => { setF(EMPTY_NEW); setImages([]); setOpen(false) } },
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
            <Field label="Brand *" value={f.brand} onChange={set('brand')} />
            <Field label="Name *" value={f.name} onChange={set('name')} placeholder="e.g. Lattafa Khamrah Qahwa" />
          </div>
          <p className="text-xs text-gray-400 mb-3">Slug is generated from the name.</p>
          <ImagePicker urls={images} onChange={setImages} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Top notes (comma-separated)" value={f.topNotes} onChange={set('topNotes')} />
            <Field label="Heart notes" value={f.heartNotes} onChange={set('heartNotes')} />
            <Field label="Base notes" value={f.baseNotes} onChange={set('baseNotes')} />
            <Field label="Accords" value={f.accords} onChange={set('accords')} />
          </div>
          <div className="mb-3">
            <Field label="House description" value={f.description} onChange={set('description')} rows={2} />
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">SEO</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Meta title" value={f.metaTitle} onChange={set('metaTitle')} />
            <Field
              label="Search terms (comma-separated)"
              value={f.searchTerms}
              onChange={set('searchTerms')}
              placeholder="e.g. khamrah qahwa, lattafa coffee perfume"
            />
          </div>
          <div className="mb-3">
            <Field label="Meta description" value={f.metaDescription} onChange={set('metaDescription')} rows={2} />
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Authenticity guide (fake-spotting)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Batch code" value={f.batchCode} onChange={set('batchCode')} placeholder="e.g. where to find it, format" />
            <Field
              label="Cap / box print notes"
              value={f.packagingNotes}
              onChange={set('packagingNotes')}
              placeholder="e.g. cap texture, box print quality"
            />
          </div>
          <div className="mb-4">
            <Field label="Other authenticity notes" value={f.otherNotes} onChange={set('otherNotes')} rows={2} />
          </div>

          <button
            onClick={submit}
            disabled={!f.brand.trim() || !f.name.trim() || create.isPending}
            className="px-4 py-2 text-xs font-medium bg-[#d4af37] hover:bg-[#c4a030] text-[#1a1a1a] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {create.isPending ? 'Creating…' : 'Create perfume'}
          </button>
        </div>
      )}
    </div>
  )
}

type Check = { label: string; filled: boolean }
type Section = { title: string; checks: Check[] }

const has = (v: string | null | undefined) => !!v && v.trim().length > 0
const hasAny = (v: string[] | null | undefined) => (v ?? []).length > 0

/** The editable fields besides image, brand, name and verified, grouped like the form. */
function sectionsOf(p: AdminPerfume): Section[] {
  return [
    {
      title: 'Notes',
      checks: [
        { label: 'Top notes', filled: hasAny(p.top_notes) },
        { label: 'Heart notes', filled: hasAny(p.heart_notes) },
        { label: 'Base notes', filled: hasAny(p.base_notes) },
        { label: 'Accords', filled: hasAny(p.accords) },
        { label: 'House description', filled: has(p.house_description) },
      ],
    },
    {
      title: 'SEO',
      checks: [
        { label: 'Meta title', filled: has(p.meta_title) },
        { label: 'Meta description', filled: has(p.meta_description) },
        { label: 'Search terms', filled: hasAny(p.search_terms) },
      ],
    },
    {
      title: 'Fake check',
      checks: [
        { label: 'Batch code', filled: has(p.authenticity_batch_code) },
        { label: 'Cap / box notes', filled: has(p.authenticity_packaging_notes) },
        { label: 'Other notes', filled: has(p.authenticity_other_notes) },
      ],
    },
  ]
}

function VerifiedPill({ verified }: { verified: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        verified ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {verified && <BadgeCheck className="w-3 h-3" aria-hidden />}
      {verified ? 'Verified' : 'Unverified'}
    </span>
  )
}

function CompletionRow({ section }: { section: Section }) {
  const done = section.checks.filter((c) => c.filled).length
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-gray-500 truncate">{section.title}</span>
      <span className="flex items-center gap-1">
        {section.checks.map((c) => (
          <span
            key={c.label}
            title={`${c.label}: ${c.filled ? 'filled' : 'empty'}`}
            className={`block w-2.5 h-2.5 rounded-full ${c.filled ? 'bg-emerald-600' : 'bg-red-500'}`}
          />
        ))}
      </span>
      <span className="ml-auto text-[11px] tabular-nums text-gray-500">
        {done}/{section.checks.length}
      </span>
    </div>
  )
}

function PerfumeCard({ perfume, onOpen }: { perfume: AdminPerfume; onOpen: () => void }) {
  const cover = perfume.images?.[0]
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={false}
      aria-label={`Expand ${perfume.brand} ${perfume.name}`}
      className="group text-left bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-[#d4af37] hover:shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4af37]"
    >
      <div className="relative aspect-[4/3] bg-gray-50">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-contain p-2" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400">
            <ImageOff className="w-5 h-5" aria-hidden />
            <span className="text-[11px]">No image</span>
          </div>
        )}
        <span className="absolute top-2 left-2">
          <VerifiedPill verified={perfume.is_verified} />
        </span>
        <span className="absolute top-1.5 right-1.5 grid place-items-center w-8 h-8 rounded-full bg-white/90 border border-gray-200 text-gray-500 group-hover:text-[#8a6d0b]">
          <Maximize2 className="w-3.5 h-3.5" aria-hidden />
        </span>
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 min-h-[2.5rem]">{perfume.name}</p>
        <p className="text-xs text-gray-500 truncate mb-2.5">{perfume.brand}</p>
        <div className="space-y-1.5">
          {sectionsOf(perfume).map((sec) => (
            <CompletionRow key={sec.title} section={sec} />
          ))}
        </div>
      </div>
    </button>
  )
}

function PerfumeEditor({
  perfume,
  dirtyRef,
  onClose,
}: {
  perfume: AdminPerfume
  dirtyRef: MutableRefObject<boolean>
  onClose: () => void
}) {
  const update = useAdminUpdatePerfume()
  const deletePerfume = useAdminDeletePerfume()
  const [showDelete, setShowDelete] = useState(false)
  const ref = useRef<HTMLElement>(null)

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
  const [images, setImages] = useState<string[]>(perfume.images ?? [])

  const dirty =
    slug !== perfume.slug ||
    name !== perfume.name ||
    brand !== perfume.brand ||
    metaTitle !== (perfume.meta_title ?? '') ||
    metaDescription !== (perfume.meta_description ?? '') ||
    searchTerms !== arrayToText(perfume.search_terms) ||
    topNotes !== arrayToText(perfume.top_notes) ||
    heartNotes !== arrayToText(perfume.heart_notes) ||
    baseNotes !== arrayToText(perfume.base_notes) ||
    accords !== arrayToText(perfume.accords) ||
    description !== (perfume.house_description ?? '') ||
    batchCode !== (perfume.authenticity_batch_code ?? '') ||
    packagingNotes !== (perfume.authenticity_packaging_notes ?? '') ||
    otherNotes !== (perfume.authenticity_other_notes ?? '') ||
    images.join('|') !== (perfume.images ?? []).join('|')

  useEffect(() => {
    dirtyRef.current = dirty
    return () => {
      dirtyRef.current = false
    }
  }, [dirty, dirtyRef])

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'start' })
    ref.current?.focus({ preventScroll: true })
  }, [])

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
      images,
      ...extra,
    })
  }

  const sectionTitle = 'text-xs font-semibold text-gray-500 mb-2'

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={`Editing ${perfume.brand} ${perfume.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !showDelete) onClose()
      }}
      className="col-span-full scroll-mt-4 bg-white rounded-xl border border-[#d4af37] shadow-sm outline-none"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">
            {perfume.name} <span className="font-normal text-gray-500">· {perfume.brand}</span>
          </h2>
          <VerifiedPill verified={perfume.is_verified} />
          {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-expanded
          className="inline-flex items-center gap-1.5 shrink-0 px-3 py-2.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          <Minimize2 className="w-3.5 h-3.5" aria-hidden />
          Collapse
        </button>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <div>
          <ImagePicker urls={images} onChange={setImages} />
        </div>

        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <Field label="Brand" value={brand} onChange={setBrand} />
            <Field label="Name" value={name} onChange={setName} />
            <Field label="Slug" value={slug} onChange={setSlug} />
          </div>

          <p className={sectionTitle}>Notes and description</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Top notes" value={topNotes} onChange={setTopNotes} />
            <Field label="Heart notes" value={heartNotes} onChange={setHeartNotes} />
            <Field label="Base notes" value={baseNotes} onChange={setBaseNotes} />
            <Field label="Accords" value={accords} onChange={setAccords} />
          </div>
          <div className="mb-4">
            <Field label="House description" value={description} onChange={setDescription} rows={2} />
          </div>

          <p className={sectionTitle}>SEO</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Meta title" value={metaTitle} onChange={setMetaTitle} />
            <Field label="Search terms (comma-separated)" value={searchTerms} onChange={setSearchTerms} />
          </div>
          <div className="mb-4">
            <Field label="Meta description" value={metaDescription} onChange={setMetaDescription} rows={2} />
          </div>

          <p className={sectionTitle}>Authenticity guide (fake-spotting)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Batch code" value={batchCode} onChange={setBatchCode} placeholder="e.g. where to find it, format" />
            <Field
              label="Cap / box print notes"
              value={packagingNotes}
              onChange={setPackagingNotes}
              placeholder="e.g. cap texture, box print quality"
            />
          </div>
          <Field label="Other authenticity notes" value={otherNotes} onChange={setOtherNotes} rows={2} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-gray-100">
        <button
          type="button"
          onClick={() => save()}
          disabled={update.isPending}
          className="px-4 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
        >
          {update.isPending ? 'Saving…' : 'Save'}
        </button>
        {!perfume.is_verified && (
          <button
            type="button"
            onClick={() => save({ is_verified: true })}
            disabled={update.isPending}
            className="px-4 py-2 text-xs font-medium bg-[#d4af37] hover:bg-[#c4a030] text-[#1a1a1a] rounded-lg disabled:opacity-50"
          >
            Save & Verify
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden />
          Delete
        </button>
      </div>

      {showDelete && (
        <ActionModal
          title="Delete perfume"
          description={`This permanently deletes "${perfume.name}" and its price history and demand-request signals. This cannot be undone. If any seller listings still reference it, deletion will be blocked.`}
          confirmLabel="Delete perfume"
          onConfirm={() =>
            deletePerfume.mutate(perfume.id, {
              onSuccess: () => {
                setShowDelete(false)
                dirtyRef.current = false
                onClose()
              },
            })
          }
          onClose={() => setShowDelete(false)}
        />
      )}
    </section>
  )
}

export default function AdminPerfumesPage() {
  const { data: perfumes = [], isLoading } = useAdminPerfumes()
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const dirtyRef = useRef(false)

  const filtered = perfumes.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
  })

  function openCard(id: string | null) {
    if (openId !== null && dirtyRef.current && !window.confirm('Discard unsaved changes?')) return
    dirtyRef.current = false
    setOpenId(id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Perfumes</h1>
        {!isLoading && (
          <p className="text-sm text-gray-500 tabular-nums">
            {filtered.length} of {perfumes.length}
          </p>
        )}
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

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">No perfumes match “{search}”.</div>
      )}

      {!isLoading && (
        <div className="grid grid-flow-dense gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filtered.map((perfume) =>
            perfume.id === openId ? (
              <PerfumeEditor key={perfume.id} perfume={perfume} dirtyRef={dirtyRef} onClose={() => openCard(null)} />
            ) : (
              <PerfumeCard key={perfume.id} perfume={perfume} onOpen={() => openCard(perfume.id)} />
            ),
          )}
        </div>
      )}
    </div>
  )
}
