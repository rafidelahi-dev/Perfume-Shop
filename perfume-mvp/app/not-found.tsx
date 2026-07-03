import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center pt-20">
        <p className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold mb-3">404</p>
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-[#1a1a1a] mb-4">
          Page not found
        </h1>
        <p className="text-gray-500 max-w-md mb-8">
          The scent trail went cold — this page doesn&apos;t exist or has moved.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-full bg-[#1a1a1a] px-8 py-3 text-sm font-medium text-white hover:bg-black transition-colors"
          >
            Back to Home
          </Link>
          <Link
            href="/perfumes"
            className="rounded-full border border-[#1a1a1a]/15 px-8 py-3 text-sm font-medium text-[#1a1a1a] hover:bg-black/5 transition-colors"
          >
            Browse Perfumes
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
