'use client'

import { useState } from 'react'
import { Phone, MessageCircle, Facebook, AlertTriangle, CheckCircle } from 'lucide-react'
import { AdminSeller, AdminListing, useSellerAction } from '@/lib/queries/admin'
import { ActionModal } from './ActionModal'
import { StatusBadge } from './StatusBadge'

type ModalType = 'flag' | 'ban' | 'unban' | null

type Props = {
  seller: AdminSeller
  listings: AdminListing[]
}

export function SellerDetailPanel({ seller, listings }: Props) {
  const [modal, setModal] = useState<ModalType>(null)
  const action = useSellerAction()

  const contactOk = !!seller.contact_number && !!(seller.whatsapp_number || seller.facebook_link)
  const sellerListings = listings.filter((l) => l.user_id === seller.id)

  function handleAction(type: ModalType, reason: string) {
    if (!type) return
    action.mutate({ id: seller.id, action: type, reason })
    setModal(null)
  }

  return (
    <>
    <div className="bg-[#fdfbf7] border-t border-gray-100 px-6 py-5 grid grid-cols-3 gap-6 text-sm">
      {/* Column 1: Profile */}
      <div className="space-y-3">
        <p className="font-medium text-gray-900">Profile</p>
        {seller.bio && <p className="text-gray-600 text-xs leading-relaxed">{seller.bio}</p>}
        {seller.location && <p className="text-gray-500 text-xs">📍 {seller.location}</p>}
        <div className="space-y-1.5">
          <div className={`flex items-center gap-2 text-xs ${seller.contact_number ? 'text-gray-700' : 'text-red-500'}`}>
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{seller.contact_number ?? 'No phone number'}</span>
          </div>
          {seller.whatsapp_number && (
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{seller.whatsapp_number}</span>
            </div>
          )}
          {seller.facebook_link && (
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <Facebook className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{seller.facebook_link}</span>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${contactOk ? 'text-green-600' : 'text-amber-600'}`}>
          {contactOk
            ? <><CheckCircle className="w-3.5 h-3.5" /> Contact complete</>
            : <><AlertTriangle className="w-3.5 h-3.5" /> Needs a second contact method</>}
        </div>
      </div>

      {/* Column 2: Listings */}
      <div className="space-y-3">
        <p className="font-medium text-gray-900">Listings ({sellerListings.length})</p>
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {sellerListings.length === 0 && <p className="text-xs text-gray-400">No listings yet.</p>}
          {sellerListings.map((l) => (
            <div key={l.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-700 truncate">{l.perfume_name ?? '—'}</span>
              <span className="text-gray-500 ml-2 flex-shrink-0">{l.price != null ? `৳${l.price}` : '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Column 3: Status + Actions */}
      <div className="space-y-3">
        <p className="font-medium text-gray-900">Status</p>
        <StatusBadge status={seller.status} />
        {seller.flag_reason && (
          <p className="text-xs text-orange-700 bg-orange-50 rounded p-2">
            <span className="font-medium">Flag reason:</span> {seller.flag_reason}
          </p>
        )}
        {seller.ban_reason && (
          <p className="text-xs text-red-700 bg-red-50 rounded p-2">
            <span className="font-medium">Ban reason:</span> {seller.ban_reason}
          </p>
        )}
        {seller.status_updated_at && (
          <p className="text-xs text-gray-400">
            Updated {new Date(seller.status_updated_at).toLocaleDateString()}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {seller.status === 'pending' && (
            <button
              onClick={() => action.mutate({ id: seller.id, action: 'approve' })}
              disabled={action.isPending}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Approve
            </button>
          )}
          {(seller.status === 'active' || seller.status === 'pending') && (
            <button
              onClick={() => setModal('flag')}
              className="px-3 py-1.5 text-xs font-medium bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg transition-colors"
            >
              Flag
            </button>
          )}
          {seller.status === 'flagged' && (
            <button
              onClick={() => action.mutate({ id: seller.id, action: 'unflag' })}
              disabled={action.isPending}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Unflag
            </button>
          )}
          {seller.status !== 'banned' && (
            <button
              onClick={() => setModal('ban')}
              className="px-3 py-1.5 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
            >
              Ban
            </button>
          )}
          {seller.status === 'banned' && (
            <button
              onClick={() => setModal('unban')}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Unban
            </button>
          )}
        </div>
      </div>
    </div>

    {modal === 'flag' && (
      <ActionModal
        title="Flag seller"
        description="Internal note only. The seller remains fully active — this is for your tracking."
        confirmLabel="Flag seller"
        confirmClass="bg-orange-500 hover:bg-orange-600 text-white"
        requireReason
        reasonPlaceholder="Reason for flagging (admin-internal only)..."
        onConfirm={(reason) => handleAction('flag', reason)}
        onClose={() => setModal(null)}
      />
    )}
    {modal === 'ban' && (
      <ActionModal
        title="Ban seller"
        description="This will permanently hide all their listings and block their account."
        confirmLabel="Ban seller"
        requireReason
        reasonPlaceholder="Reason for ban..."
        onConfirm={(reason) => handleAction('ban', reason)}
        onClose={() => setModal(null)}
      />
    )}
    {modal === 'unban' && (
      <ActionModal
        title="Unban seller"
        description="This restores their account and makes their listings visible again."
        confirmLabel="Unban seller"
        confirmClass="bg-green-600 hover:bg-green-700 text-white"
        onConfirm={() => handleAction('unban', '')}
        onClose={() => setModal(null)}
      />
    )}
    </>
  )
}
