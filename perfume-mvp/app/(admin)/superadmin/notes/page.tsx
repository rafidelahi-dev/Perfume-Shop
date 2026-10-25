'use client'

import { useMemo, useRef, useState } from 'react'
import { ImagePlus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminNotes, useSetNoteImage } from '@/lib/queries/adminNotes'
import { uploadAdminPerfumeImages, useAdminPerfumes } from '@/lib/queries/adminPerfumes'

type Filter = 'all' | 'missing' | 'done'

function NoteCard({ name, image, uses }: { name: string; image: string | null; uses: number }) {
  const setImage = useSetNoteImage()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const [url] = await uploadAdminPerfumeImages([file])
      await setImage.mutateAsync({ name, image_url: url })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-black/5 bg-white p-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-label={image ? `Replace image for ${name}` : `Add image for ${name}`}
          className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-[#d4af37] hover:text-[#d4af37] disabled:opacity-50"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6" />
          )}
        </button>
        {image && (
          <button
            type="button"
            onClick={() => setImage.mutate({ name, image_url: null })}
            aria-label={`Remove image for ${name}`}
            className="absolute -right-2 -top-2 rounded-full border border-gray-200 bg-white p-1 text-gray-500 hover:text-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      <p className="text-center text-sm font-medium capitalize text-gray-900">{name}</p>
      <p className="text-xs text-gray-400">{uses} perfume{uses === 1 ? '' : 's'}</p>
    </div>
  )
}

export default function NotesPage() {
  const { data: notes = [], isLoading, isError } = useAdminNotes()
  const { data: perfumes = [] } = useAdminPerfumes()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('missing')

  const uses = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of perfumes) {
      const all = new Set([...p.top_notes, ...p.heart_notes, ...p.base_notes].map((n) => n.trim().toLowerCase()))
      for (const n of all) m.set(n, (m.get(n) ?? 0) + 1)
    }
    return m
  }, [perfumes])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return notes
      .filter((n) => (!q || n.name.includes(q)) && (filter === 'all' || (filter === 'missing') === !n.image_url))
      .sort((a, b) => (uses.get(b.name) ?? 0) - (uses.get(a.name) ?? 0) || a.name.localeCompare(b.name))
  }, [notes, search, filter, uses])

  const withImage = notes.filter((n) => n.image_url).length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
        <span className="text-sm text-gray-500">{withImage} / {notes.length} have images</span>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-gray-500">
        One image per note, shown on every fragrance page that uses it. New notes appear here
        automatically when you add them to a perfume. Most-used notes come first.
      </p>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          aria-label="Filter notes"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="missing">Missing image</option>
          <option value="done">Has image</option>
          <option value="all">All</option>
        </select>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && <p className="text-sm text-red-600">Could not load notes.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {filtered.map((n) => (
          <NoteCard key={n.name} name={n.name} image={n.image_url} uses={uses.get(n.name) ?? 0} />
        ))}
      </div>
    </div>
  )
}
