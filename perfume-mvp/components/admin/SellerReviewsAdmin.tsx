'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/admin/StatusBadge'

type Person = { display_name: string | null; username: string | null } | null
type Row = {
  id: string
  rating: number
  comment: string | null
  is_flagged: boolean
  flag_reason: string | null
  is_hidden: boolean
  seller: Person
  reviewer: Person
}

const KEY = ['admin', 'seller-reviews']
const name = (p: Person) => p?.display_name ?? p?.username ?? '—'
const status = (r: Row) => (r.is_hidden ? 'hidden' : r.is_flagged ? 'flagged' : 'active')

export default function SellerReviewsAdmin() {
  const qc = useQueryClient()
  const { data = [], isLoading, isError } = useQuery<Row[]>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await fetch('/api/admin/seller-reviews')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const act = useMutation({
    mutationFn: async (v: { id: string; action?: 'unflag' | 'hide' | 'unhide'; remove?: boolean }) => {
      const res = v.remove
        ? await fetch(`/api/admin/seller-reviews/${v.id}`, { method: 'DELETE' })
        : await fetch(`/api/admin/seller-reviews/${v.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: v.action }),
          })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: () => toast.error('Action failed. Please try again.'),
  })

  const btn = 'px-2.5 py-1 text-xs font-medium rounded-lg transition-colors'

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Seller ratings</h2>
        <span className="text-sm text-gray-500">{data.length} total</span>
      </div>
      {isLoading && <div className="py-8 text-center text-gray-400">Loading...</div>}
      {isError && <div className="py-8 text-center text-red-500">Failed to load seller ratings.</div>}
      {!isLoading && !isError && data.length === 0 && (
        <div className="py-8 text-center text-gray-400">No seller ratings yet.</div>
      )}
      {data.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {data.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[1.2fr_70px_2fr_90px_220px] gap-4 px-6 py-4 items-center border-b border-gray-100"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">Seller: {name(r.seller)}</p>
                <p className="text-xs text-gray-400">By {name(r.reviewer)}</p>
              </div>
              <span className="text-xs text-gray-600">{r.rating} ★</span>
              <div className="text-xs text-gray-600">
                <p className="line-clamp-2">{r.comment ?? '—'}</p>
                {r.is_flagged && r.flag_reason && (
                  <p className="mt-1 text-orange-700">Reported: {r.flag_reason}</p>
                )}
              </div>
              <StatusBadge status={status(r)} />
              <div className="flex items-center gap-2">
                {r.is_flagged && (
                  <button
                    onClick={() => act.mutate({ id: r.id, action: 'unflag' })}
                    className={`${btn} bg-gray-100 hover:bg-gray-200 text-gray-700`}
                  >
                    Unflag
                  </button>
                )}
                <button
                  onClick={() => act.mutate({ id: r.id, action: r.is_hidden ? 'unhide' : 'hide' })}
                  className={`${btn} bg-gray-100 hover:bg-gray-200 text-gray-700`}
                >
                  {r.is_hidden ? 'Unhide' : 'Hide'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Permanently delete this rating?')) act.mutate({ id: r.id, remove: true })
                  }}
                  className={`${btn} bg-red-100 hover:bg-red-200 text-red-800`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
