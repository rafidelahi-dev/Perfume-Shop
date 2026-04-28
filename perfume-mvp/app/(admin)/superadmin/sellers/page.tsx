'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useAdminSellers, useAdminListings } from '@/lib/queries/admin'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { SellerDetailPanel } from '@/components/admin/SellerDetailPanel'

type Filter = 'all' | 'pending' | 'active' | 'flagged' | 'banned'
const FILTERS: Filter[] = ['all', 'pending', 'active', 'flagged', 'banned']

export default function SellersPage() {
  const { data: sellers = [], isLoading } = useAdminSellers()
  const { data: listings = [] } = useAdminListings()
  const [filter, setFilter] = useState<Filter>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const pendingCount = sellers.filter((s) => s.status === 'pending').length
  const filtered = filter === 'all' ? sellers : sellers.filter((s) => s.status === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sellers</h1>
        <span className="text-sm text-gray-500">{sellers.length} total</span>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center py-20 text-gray-400">Loading...</div>}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">No sellers in this category.</div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_60px_100px_32px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Seller</span>
            <span>Contact</span>
            <span>Signed up</span>
            <span>Listings</span>
            <span>Status</span>
            <span />
          </div>

          {filtered.map((seller) => (
            <div key={seller.id}>
              <button
                onClick={() => setExpandedId(expandedId === seller.id ? null : seller.id)}
                className="w-full grid grid-cols-[1.5fr_1fr_1fr_60px_100px_32px] gap-4 px-6 py-4 items-center border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">{seller.display_name ?? '—'}</p>
                  <p className="text-xs text-gray-400">@{seller.username ?? '—'}</p>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="text-xs">{seller.contact_number ?? '—'}</p>
                  <p className="text-xs text-gray-400">
                    {seller.whatsapp_number ? 'WhatsApp' : seller.facebook_link ? 'Facebook' : 'No secondary'}
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(seller.created_at).toLocaleDateString()}
                </span>
                <span className="text-sm font-medium text-gray-900 tabular-nums">
                  {seller.listing_count}
                </span>
                <StatusBadge status={seller.status} />
                <span className="text-gray-400">
                  {expandedId === seller.id
                    ? <ChevronDown className="w-4 h-4" />
                    : <ChevronRight className="w-4 h-4" />}
                </span>
              </button>

              {expandedId === seller.id && (
                <SellerDetailPanel seller={seller} listings={listings} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
