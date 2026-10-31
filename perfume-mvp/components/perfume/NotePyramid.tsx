'use client'
/* eslint-disable @next/next/no-img-element */
import { L, useLang } from '@/lib/lang'
import type { NoteInfo } from '@/lib/queries/notes'

type Tier = { en: string; bn: string; notes: string[] }

// Each tier gets a narrower max width at the top so the stack reads as a pyramid.
const TIER_WIDTH = ['max-w-md', 'max-w-2xl', 'max-w-4xl']

function NoteChip({ name, info }: { name: string; info?: NoteInfo }) {
  const bn = useLang() === 'bn' ? info?.bn : undefined
  return (
    <li className="flex w-20 flex-col items-center gap-1.5 text-center sm:w-24">
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-gray-50 sm:h-16 sm:w-16">
        {info?.image ? (
          <img src={info.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden className="text-lg font-serif text-[#d4af37]/70">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      {bn ? (
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-[#1a1a1a] sm:text-base">{bn}</span>
          <span className="block text-[10px] capitalize text-gray-500 sm:text-xs">{name}</span>
        </span>
      ) : (
        <span className="text-xs font-medium capitalize leading-tight text-[#1a1a1a] sm:text-sm">{name}</span>
      )}
    </li>
  )
}

export default function NotePyramid({
  top,
  heart,
  base,
  info,
}: {
  top: string[]
  heart: string[]
  base: string[]
  info: Record<string, NoteInfo>
}) {
  const tiers: Tier[] = [
    { en: 'Top notes', bn: 'শীর্ষ নোট', notes: top },
    { en: 'Middle notes', bn: 'মধ্য নোট', notes: heart },
    { en: 'Base notes', bn: 'বেস নোট', notes: base },
  ]

  return (
    <div className="flex flex-col items-center gap-6">
      {tiers.map(({ en, bn, notes }, i) => (
        <section key={en} className={`w-full ${TIER_WIDTH[i]}`} aria-label={en}>
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200" />
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              <L en={en} bn={bn} />
            </h3>
            <span className="h-px flex-1 bg-gray-200" />
          </div>
          {notes.length > 0 ? (
            <ul className="flex flex-wrap justify-center gap-x-2 gap-y-4">
              {notes.map((n) => (
                <NoteChip key={n} name={n} info={info[n.trim().toLowerCase()]} />
              ))}
            </ul>
          ) : (
            <p className="text-center text-sm italic text-gray-400">
              <L en="Not yet documented" bn="এখনো যোগ করা হয়নি" />
            </p>
          )}
        </section>
      ))}
    </div>
  )
}
