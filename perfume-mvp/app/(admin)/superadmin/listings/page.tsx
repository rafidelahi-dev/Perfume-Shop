'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { useAdminListings, useListingAction, useDeleteListing, AdminListing } from '@/lib/queries/admin'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ActionModal } from '@/components/admin/ActionModal'

type StatusFilter = 'all' | 'active' | 'flagged' | 'hidden'
type TypeFilter   = 'all' | 'intact' | 'full' | 'partial' | 'decant'

function listingStatus(l: AdminListing): string {
  if (l.is_hidden)  return 'hidden'
  if (l.is_flagged) return 'flagged'
  return 'active'
}

export default function ListingsPage() {
  const { data: listings = [], isLoading } = useAdminListings()
  const flagAction   = useListingAction()
  const deleteAction = useDeleteListing()

  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>('all')
  const [flagModal, setFlagModal]       = useState<string | null>(null)
  const [removeModal, setRemoveModal]   = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return listings.filter((l) => {
      if (q && !(
        l.perfume_name?.toLowerCase().includes(q) ||
        l.brand?.toLowerCase().includes(q) ||
        l.profiles?.display_name?.toLowerCase().includes(q) ||
        l.profiles?.username?.toLowerCase().includes(q)
      )) return false
      if (statusFilter !== 'all' && listingStatus(l) !== statusFilter) return false
      if (typeFilter !== 'all' && l.type !== typeFilter) return false
      return true
    })
  }, [listings, search, statusFilter, typeFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
        <span className="text-sm text-gray-500">{listings.length} total</span>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search perfume, brand, or seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="hidden">Hidden</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
        >
          <option value="all">All types</option>
          <option value="intact">Intact</option>
          <option value="full">Full</option>
          <option value="partial">Partial</option>
          <option value="decant">Decant</option>
        </select>
      </div>

      {isLoading && <div className="text-center py-20 text-gray-400">Loading...</div>}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">No listings match your filters.</div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_80px_80px_90px_140px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Perfume</span>
            <span>Seller</span>
            <span>Price</span>
            <span>Type</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {filtered.map((listing) => (
            <div
              key={listing.id}
              className="grid grid-cols-[2fr_1fr_80px_80px_90px_140px] gap-4 px-6 py-4 items-center border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div>
                <a
                  href={`/perfumes/${listing.profiles?.username}/${listing.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-gray-900 hover:text-[#d4af37] flex items-center gap-1"
                >
                  {listing.perfume_name ?? '—'}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
                <p className="text-xs text-gray-400">{listing.brand ?? '—'}</p>
              </div>

              <div className="text-xs text-gray-600">
                <p>{listing.profiles?.display_name ?? '—'}</p>
                <p className="text-gray-400">@{listing.profiles?.username ?? '—'}</p>
              </div>

              <span className="text-sm font-medium text-gray-900">৳{listing.price ?? '—'}</span>

              <span className="text-xs text-gray-500 capitalize">{listing.type ?? '—'}</span>

              <StatusBadge status={listingStatus(listing)} />

              <div className="flex items-center gap-2">
                {!listing.is_hidden && (
                  !listing.is_flagged ? (
                    <button
                      onClick={() => setFlagModal(listing.id)}
                      className="px-2.5 py-1 text-xs font-medium bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg transition-colors"
                    >
                      Flag
                    </button>
                  ) : (
                    <button
                      onClick={() => flagAction.mutate({ id: listing.id, action: 'unflag' })}
                      className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      Unflag
                    </button>
                  )
                )}
                <button
                  onClick={() => setRemoveModal(listing.id)}
                  className="px-2.5 py-1 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {flagModal && (
        <ActionModal
          title="Flag listing"
          description="The seller will see this comment on their dashboard so they know what to fix."
          confirmLabel="Flag listing"
          confirmClass="bg-orange-500 hover:bg-orange-600 text-white"
          requireReason
          reasonPlaceholder="Reason visible to seller..."
          onConfirm={(reason) => { flagAction.mutate({ id: flagModal!, action: 'flag', reason }); setFlagModal(null) }}
          onClose={() => setFlagModal(null)}
        />
      )}

      {removeModal && (
        <ActionModal
          title="Remove listing"
          description="This permanently deletes the listing. This cannot be undone."
          confirmLabel="Remove listing"
          onConfirm={() => { deleteAction.mutate(removeModal!); setRemoveModal(null) }}
          onClose={() => setRemoveModal(null)}
        />
      )}
    </div>
  )
}
