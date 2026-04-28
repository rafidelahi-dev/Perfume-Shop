'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  title: string
  description: string
  confirmLabel: string
  confirmClass?: string
  requireReason?: boolean
  reasonPlaceholder?: string
  onConfirm: (reason: string) => void
  onClose: () => void
}

export function ActionModal({
  title,
  description,
  confirmLabel,
  confirmClass = 'bg-red-600 hover:bg-red-700 text-white',
  requireReason = false,
  reasonPlaceholder = 'Enter reason...',
  onConfirm,
  onClose,
}: Props) {
  const [reason, setReason] = useState('')
  const canConfirm = !requireReason || reason.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        {requireReason && (
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37] resize-none mb-4"
            rows={3}
            placeholder={reasonPlaceholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => canConfirm && onConfirm(reason)}
            disabled={!canConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
