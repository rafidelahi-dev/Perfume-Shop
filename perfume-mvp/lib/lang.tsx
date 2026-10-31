'use client'

import { useSyncExternalStore } from 'react'

export type Lang = 'en' | 'bn'

const KEY = 'lang'
const listeners = new Set<() => void>()

function read(): Lang {
  try {
    return localStorage.getItem(KEY) === 'bn' ? 'bn' : 'en'
  } catch {
    return 'en'
  }
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    // storage blocked: the choice just won't persist
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}

// Server and first client render are always English (pages stay ISR-cacheable);
// the stored choice applies right after hydration.
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, read, () => 'en')
}

/** Inline text that switches with the language toggle; usable from server components. */
export function L({ en, bn }: { en: string; bn: string }) {
  return <>{useLang() === 'bn' ? bn : en}</>
}

// Accord words as people in Bangladeshi cities say them. Missing = stays English.
const ACCORD_BN: Record<string, string> = {
  airy: 'হালকা বাতাসি', aquatic: 'জলীয়', aromatic: 'সুগন্ধি ভেষজ', balsamic: 'রজনীয়',
  'bright citrus': 'উজ্জ্বল লেবুজাতীয়', 'bright tropical': 'উজ্জ্বল ট্রপিক্যাল', cinnamon: 'দারুচিনি',
  citrus: 'লেবুজাতীয়', citrusy: 'লেবুজাতীয়', 'citrusy fresh': 'লেবুজাতীয় সতেজ', clean: 'পরিচ্ছন্ন',
  'clean woody': 'পরিচ্ছন্ন কাঠ', cool: 'শীতল', creamy: 'ক্রিমি', 'creamy citrus': 'ক্রিমি লেবুজাতীয়',
  dark: 'গাঢ়', earthy: 'মাটির গন্ধ', 'earthy patchouli': 'মাটির প্যাচুলি', feminine: 'নারীসুলভ',
  floral: 'ফুলের', fresh: 'সতেজ', 'fresh floral': 'সতেজ ফুলের', 'fresh spicy': 'সতেজ মসলাদার',
  'frosty fresh': 'শীতল সতেজ', fruity: 'ফলের', green: 'সবুজ', herbal: 'ভেষজ', honeyed: 'মধুর',
  juicy: 'রসালো', leather: 'চামড়া', leathery: 'চামড়ার', marine: 'সামুদ্রিক', milky: 'দুধেল',
  mineral: 'খনিজ', minty: 'পুদিনার', 'minty fresh': 'পুদিনা সতেজ', mossy: 'শ্যাওলার', musky: 'মাস্কি',
  nutty: 'বাদামের', oriental: 'প্রাচ্য', 'oriental vanilla': 'প্রাচ্য ভ্যানিলা', oud: 'আগর/উদ',
  powdery: 'পাউডারি', refined: 'মার্জিত', rosy: 'গোলাপি', saffron: 'জাফরান', 'salty marine': 'নোনা সামুদ্রিক',
  smoky: 'ধোঁয়াটে', smooth: 'মসৃণ', sophisticated: 'রুচিশীল', sparkling: 'ঝলমলে', spicy: 'মসলাদার',
  'spiced citrus': 'মসলাদার লেবুজাতীয়', suede: 'সুয়েড', sweet: 'মিষ্টি', 'sweet ambery': 'মিষ্টি অ্যাম্বারি',
  'sweet aquatic': 'মিষ্টি জলীয়', 'sweet chocolate': 'মিষ্টি চকলেট', 'sweet creamy': 'মিষ্টি ক্রিমি',
  'sweet fruity': 'মিষ্টি ফলের', 'sweet nutty': 'মিষ্টি বাদামের', 'sweet vanilla': 'মিষ্টি ভ্যানিলা',
  'sweet woody': 'মিষ্টি কাঠ', tart: 'টক', 'tart citrus': 'টক লেবুজাতীয়', 'tart tropical': 'টক ট্রপিক্যাল',
  tobacco: 'তামাক', tropical: 'ট্রপিক্যাল', warm: 'উষ্ণ', 'warm balsamic': 'উষ্ণ রজনীয়',
  'warm spicy': 'উষ্ণ মসলাদার', 'warm sweet': 'উষ্ণ মিষ্টি', watery: 'পানির মতো', 'white musky': 'সাদা মাস্কি',
  woody: 'কাঠের', almond: 'কাঠবাদাম', boozy: 'মদির', brisk: 'তরতাজা', 'crisp citrus': 'ঝরঝরে লেবুজাতীয়',
  'crisp green': 'ঝরঝরে সবুজ', formal: 'ফর্মাল', modern: 'আধুনিক', gourmand: 'মিষ্টান্নের মতো',
}

export function accordLabel(name: string, lang: Lang): string {
  return lang === 'bn' ? (ACCORD_BN[name.trim().toLowerCase()] ?? name) : name
}

/** Accord list that follows the toggle. */
export function Accords({ names, sep = ' · ' }: { names: string[]; sep?: string }) {
  const lang = useLang()
  return <>{names.map((n) => accordLabel(n, lang)).join(sep)}</>
}

export function LangToggle({ className = '' }: { className?: string }) {
  const lang = useLang()
  const opt = (value: Lang, label: string) => (
    <button
      type="button"
      onClick={() => setLang(value)}
      aria-pressed={lang === value}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        lang === value ? 'bg-[#1a1a1a] text-[#f8f7f3]' : 'text-[#1a1a1a]/70 hover:text-[#1a1a1a]'
      }`}
    >
      {label}
    </button>
  )
  return (
    <div role="group" aria-label="Language" className={`inline-flex rounded-full border border-black/10 p-0.5 ${className}`}>
      {opt('bn', 'বাংলা')}
      {opt('en', 'EN')}
    </div>
  )
}
