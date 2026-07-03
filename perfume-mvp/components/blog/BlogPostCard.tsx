import Link from 'next/link'
import Image from 'next/image'

type Props = {
  slug: string
  title: string
  excerpt: string
  cover_image_url: string | null
  published_at: string | null
  category?: string | null
}

function readTime(excerpt: string) {
  const words = excerpt.split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

export default function BlogPostCard({ slug, title, excerpt, cover_image_url, published_at, category }: Props) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="group flex flex-col rounded-2xl border border-black/5 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-[#d4af37]/30 transition-all"
    >
      {cover_image_url ? (
        <div className="relative h-44 w-full overflow-hidden">
          <Image
            src={cover_image_url}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="h-44 w-full bg-gradient-to-br from-[#d4af37]/10 to-[#d4af37]/5 flex items-center justify-center">
          <span className="text-[#d4af37] text-3xl">✦</span>
        </div>
      )}
      <div className="flex flex-col flex-1 p-4">
        {category && (
          <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-widest text-[#d4af37]">
            {category}
          </span>
        )}
        <h3 className="font-serif font-semibold text-[#1a1a1a] text-base leading-snug mb-2 line-clamp-2">
          {title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2 flex-1">{excerpt}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>{readTime(excerpt)} min read</span>
          {published_at && (
            <span>
              {new Date(published_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
