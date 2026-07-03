'use client'

import Link from 'next/link'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center pt-20">
      <p className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-3">Error</p>
      <h1 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-4">Something went wrong</h1>
      <p className="text-gray-500 max-w-md mb-8">
        An unexpected error occurred. Try again, or head back home.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <button
          onClick={reset}
          className="rounded-full bg-[#1a1a1a] px-8 py-3 text-sm font-medium text-white hover:bg-black transition-colors"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-full border border-[#1a1a1a]/15 px-8 py-3 text-sm font-medium text-[#1a1a1a] hover:bg-black/5 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </main>
  )
}
