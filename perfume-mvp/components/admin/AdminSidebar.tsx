'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, List, FileText, Droplet } from 'lucide-react'
import { useAdminSellers } from '@/lib/queries/admin'
import { useAdminBlogPosts } from '@/lib/queries/blog'
import { useAdminPerfumes } from '@/lib/queries/adminPerfumes'

const NAV = [
  { href: '/superadmin/sellers',  label: 'Sellers',  icon: Users },
  { href: '/superadmin/listings', label: 'Listings', icon: List },
  { href: '/superadmin/blog',     label: 'Blog',     icon: FileText },
  { href: '/superadmin/perfumes', label: 'Perfumes', icon: Droplet },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  const { data: sellers = [] } = useAdminSellers()
  const { data: blogPosts = [] } = useAdminBlogPosts()
  const { data: perfumes = [] } = useAdminPerfumes()

  const pendingCount = sellers.filter((s) => s.status === 'pending').length
  const blogPendingCount = blogPosts.filter((p) => p.status === 'pending_review').length
  const unverifiedPerfumeCount = perfumes.filter((p) => !p.is_verified).length

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="px-6 py-5 border-b border-gray-200">
        <span className="text-xs font-semibold text-[#d4af37] uppercase tracking-widest">
          Superadmin
        </span>
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
              {href === '/superadmin/sellers' && pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {pendingCount}
                </span>
              )}
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
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
