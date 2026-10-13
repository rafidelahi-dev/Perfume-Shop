'use client'

type Props = {
  title: string
  slug: string
  excerpt: string
  metaTitle: string
  metaDescription: string
  onMetaTitleChange: (v: string) => void
  onMetaDescriptionChange: (v: string) => void
}

const SITE_HOST = 'cloudperfumebd.com'
// Google truncates by pixel width. Bangla glyphs are wider than Latin, so the
// safe limits are lower than the usual 60 / 160 characters.
const TITLE_MAX = 60
const DESC_MAX = 160

function Counter({ value, max }: { value: number; max: number }) {
  const over = value > max
  return (
    <span className={`text-xs ${over ? 'text-red-600' : 'text-gray-400'}`}>
      {value}/{max}
    </span>
  )
}

export default function SeoFields({
  title, slug, excerpt, metaTitle, metaDescription, onMetaTitleChange, onMetaDescriptionChange,
}: Props) {
  const shownTitle = metaTitle.trim() || title || 'Post title'
  const shownDesc = metaDescription.trim() || excerpt || 'Meta description falls back to the excerpt.'

  return (
    <fieldset className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-700">Search appearance (SEO)</legend>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            SEO title <span className="font-normal text-gray-400">(optional, defaults to title)</span>
          </label>
          <Counter value={metaTitle.length} max={TITLE_MAX} />
        </div>
        <input
          value={metaTitle}
          onChange={(e) => onMetaTitleChange(e.target.value)}
          placeholder={title}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Meta description <span className="font-normal text-gray-400">(optional, defaults to excerpt)</span>
          </label>
          <Counter value={metaDescription.length} max={DESC_MAX} />
        </div>
        <textarea
          rows={2}
          value={metaDescription}
          onChange={(e) => onMetaDescriptionChange(e.target.value)}
          placeholder={excerpt}
          className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <p className="mt-1 text-xs text-gray-400">
          Bangla text is wider in search results: aim for about 100 characters if the text is Bangla.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">Google preview</p>
        <p className="truncate text-xs text-gray-600">{SITE_HOST} › blog › {slug || 'slug'}</p>
        <p className="truncate text-lg leading-snug text-[#1a0dab]">{shownTitle}</p>
        <p className="line-clamp-2 text-sm text-gray-600">{shownDesc}</p>
      </div>
    </fieldset>
  )
}
