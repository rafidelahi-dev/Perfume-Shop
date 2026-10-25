/* eslint-disable @next/next/no-img-element */
type Tier = { label: string; notes: string[] }

// Each tier gets a narrower max width at the top so the stack reads as a pyramid.
const TIER_WIDTH = ['max-w-md', 'max-w-2xl', 'max-w-4xl']

function NoteChip({ name, image }: { name: string; image?: string }) {
  return (
    <li className="flex w-20 flex-col items-center gap-1.5 text-center sm:w-24">
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-gray-50 sm:h-16 sm:w-16">
        {image ? (
          <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden className="text-lg font-serif text-[#d4af37]/70">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <span className="text-xs font-medium capitalize leading-tight text-[#1a1a1a] sm:text-sm">{name}</span>
    </li>
  )
}

export default function NotePyramid({
  top,
  heart,
  base,
  images,
}: {
  top: string[]
  heart: string[]
  base: string[]
  images: Record<string, string>
}) {
  const tiers: Tier[] = [
    { label: 'Top notes', notes: top },
    { label: 'Middle notes', notes: heart },
    { label: 'Base notes', notes: base },
  ]

  return (
    <div className="flex flex-col items-center gap-6">
      {tiers.map(({ label, notes }, i) => (
        <section key={label} className={`w-full ${TIER_WIDTH[i]}`} aria-label={label}>
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200" />
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</h3>
            <span className="h-px flex-1 bg-gray-200" />
          </div>
          {notes.length > 0 ? (
            <ul className="flex flex-wrap justify-center gap-x-2 gap-y-4">
              {notes.map((n) => (
                <NoteChip key={n} name={n} image={images[n.trim().toLowerCase()]} />
              ))}
            </ul>
          ) : (
            <p className="text-center text-sm italic text-gray-400">Not yet documented</p>
          )}
        </section>
      ))}
    </div>
  )
}
