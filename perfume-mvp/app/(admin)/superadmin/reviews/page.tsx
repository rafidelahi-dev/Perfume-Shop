'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useAdminReviews, useReviewAction, useDeleteReview, AdminReview } from '@/lib/queries/admin'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ActionModal } from '@/components/admin/ActionModal'

type StatusFilter = 'all' | 'active' | 'flagged' | 'hidden'

const RATING_LABEL: Record<number, string> = {
  5: '❤️ Love',
  4: '👍 Like',
  3: '😐 Okay',
  2: '👎 Dislike',
  1: '💀 Hate',
}

function reviewStatus(r: AdminReview): string {
  if (r.is_hidden)  return 'hidden'
  if (r.is_flagged) return 'flagged'
  return 'active'
}

export default function ReviewsPage() {
  const { data: reviews = [], isLoading, isError } = useAdminReviews()
  const flagAction   = useReviewAction()
  const deleteAction = useDeleteReview()

  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [flagModal, setFlagModal]       = useState<string | null>(null)
  const [removeModal, setRemoveModal]   = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return reviews.filter((r) => {
      if (q && !(
        r.perfume_name?.toLowerCase().includes(q) ||
        r.brand?.toLowerCase().includes(q) ||
        r.profiles?.display_name?.toLowerCase().includes(q) ||
        r.profiles?.username?.toLowerCase().includes(q)
      )) return false
      if (statusFilter !== 'all' && reviewStatus(r) !== statusFilter) return false
      return true
    })
  }, [reviews, search, statusFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <span className="text-sm text-gray-500">{reviews.length} total</span>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search perfume, brand, or reviewer..."
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
      </div>

      {isLoading && <div className="text-center py-20 text-gray-400">Loading...</div>}
      {isError && <div className="text-center py-20 text-red-500">Failed to load reviews. Please refresh.</div>}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">No reviews match your filters.</div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-[1.5fr_100px_2fr_100px_90px_140px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span>Perfume</span>
            <span>Rating</span>
            <span>Review</span>
            <span>Owns Bottle</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {filtered.map((review) => (
            <div
              key={review.id}
              className="grid grid-cols-[1.5fr_100px_2fr_100px_90px_140px] gap-4 px-6 py-4 items-center border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{review.perfume_name}</p>
                <p className="text-xs text-gray-400">{review.brand}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {review.profiles?.display_name ?? review.profiles?.username ?? '—'}
                </p>
              </div>

              <span className="text-xs text-gray-600">
                {review.rating ? RATING_LABEL[review.rating] : '—'}
              </span>

              <p className="text-xs text-gray-600 line-clamp-2">{review.review_text ?? '—'}</p>

              <span className="text-xs text-gray-500">{review.owns_bottle ? 'Yes' : 'No'}</span>

              <StatusBadge status={reviewStatus(review)} />

              <div className="flex items-center gap-2">
                {!review.is_hidden && (
                  !review.is_flagged ? (
                    <button
                      onClick={() => setFlagModal(review.id)}
                      className="px-2.5 py-1 text-xs font-medium bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg transition-colors"
                    >
                      Flag
                    </button>
                  ) : (
                    <button
                      onClick={() => flagAction.mutate({ id: review.id, action: 'unflag' })}
                      className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      Unflag
                    </button>
                  )
                )}
                <button
                  onClick={() => setRemoveModal(review.id)}
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
          title="Flag review"
          description="The reviewer will see this comment on their dashboard so they know what to fix."
          confirmLabel="Flag review"
          confirmClass="bg-orange-500 hover:bg-orange-600 text-white"
          requireReason
          reasonPlaceholder="Reason visible to reviewer..."
          onConfirm={(reason) => { flagAction.mutate({ id: flagModal!, action: 'flag', reason }, { onSuccess: () => setFlagModal(null) }) }}
          onClose={() => setFlagModal(null)}
        />
      )}

      {removeModal && (
        <ActionModal
          title="Remove review"
          description="This permanently deletes the review. This cannot be undone."
          confirmLabel="Remove review"
          onConfirm={() => { deleteAction.mutate(removeModal!, { onSuccess: () => setRemoveModal(null) }) }}
          onClose={() => setRemoveModal(null)}
        />
      )}
    </div>
  )
}
