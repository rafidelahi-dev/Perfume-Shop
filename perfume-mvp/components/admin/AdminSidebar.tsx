'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Users, List, FileText, Droplet, MessageSquare, Leaf, Menu, X, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { withTimeout } from '@/lib/queries/auth'
import { useAdminSellers, useAdminReviews } from '@/lib/queries/admin'
import { useAdminBlogPosts } from '@/lib/queries/blog'
import { useAdminPerfumes } from '@/lib/queries/adminPerfumes'

const NAV = [
  { href: '/superadmin/sellers',  label: 'Sellers',  icon: Users },
  { href: '/superadmin/listings', label: 'Listings', icon: List },
  { href: '/superadmin/reviews',  label: 'Reviews',  icon: MessageSquare },
  { href: '/superadmin/blog',     label: 'Blog',     icon: FileText },
  { href: '/superadmin/perfumes', label: 'Perfumes', icon: Droplet },
  { href: '/superadmin/notes',    label: 'Notes',    icon: Leaf },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Close the drawer after navigating
  useEffect(() => setOpen(false), [pathname])

  const logout = async () => {
    await withTimeout(supabase.auth.signOut({ scope: 'local' }), 4000, undefined)
    startTransition(() => router.replace('/login'))
  }

  const { data: sellers = [] } = useAdminSellers()
  const { data: blogPosts = [] } = useAdminBlogPosts()
  const { data: perfumes = [] } = useAdminPerfumes()
  const { data: reviews = [] } = useAdminReviews()

  const blogPendingCount = blogPosts.filter((p) => p.status === 'pending_review').length
  const unverifiedPerfumeCount = perfumes.filter((p) => !p.is_verified).length
  const flaggedReviewCount = reviews.filter((r) => r.is_flagged).length

  return (
    <>
    {/* Mobile top bar: the sidebar is a drawer below lg */}
    <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-3">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open admin menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="text-xs font-semibold text-[#d4af37] uppercase tracking-widest">Superadmin</span>
    </div>
    {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />}
    <aside
      className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-dvh lg:h-screen w-64 lg:w-56 overflow-y-auto bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-transform duration-300 ${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
        <span className="text-xs font-semibold text-[#d4af37] uppercase tracking-widest">
          Superadmin
        </span>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close admin menu"
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#d4af37]/10 text-[#d4af37]'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {href === '/superadmin/blog' && blogPendingCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {blogPendingCount}
                </span>
              )}
              {href === '/superadmin/perfumes' && unverifiedPerfumeCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {unverifiedPerfumeCount}
                </span>
              )}
              {href === '/superadmin/reviews' && flaggedReviewCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {flaggedReviewCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-gray-200 px-3 py-3 pb-4">
        <button
          onClick={logout}
          disabled={isPending}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {isPending ? 'Logging out…' : 'Logout'}
        </button>
      </div>
    </aside>
    </>
  )
}
