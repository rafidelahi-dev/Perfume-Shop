'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  value: string | null
  onChange: (url: string | null) => void
  postId: string
}

export default function CoverImageUpload({ value, onChange, postId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('postId', postId)
    fd.append('type', 'cover')
    const res = await fetch('/api/blog/upload', { method: 'POST', body: fd })
    setUploading(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body.error ?? 'Upload failed')
      return
    }
    const { url } = await res.json()
    onChange(url)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Cover image</label>
      {value ? (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
          <Image src={value} alt="Cover" fill className="object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 bg-white/90 rounded-full p-1 hover:bg-white shadow"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 w-full h-32 border-2 border-dashed border-gray-300 rounded-lg justify-center text-gray-500 hover:border-[#d4af37] hover:text-[#8a7224] transition-colors disabled:opacity-60"
        >
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm">{uploading ? 'Uploading…' : 'Upload cover image'}</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
