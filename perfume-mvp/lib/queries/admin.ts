import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from './key'

export type AdminSeller = {
  id: string
  username: string | null
  display_name: string | null
  contact_number: string | null
  whatsapp_number: string | null
  facebook_link: string | null
  bio: string | null
  location: string | null
  avatar_url: string | null
  status: 'pending' | 'active' | 'flagged' | 'banned'
  flag_reason: string | null
  ban_reason: string | null
  status_updated_at: string | null
  created_at: string
  listing_count: number
}

export type AdminListing = {
  id: string
  perfume_name: string | null
  brand: string | null
  price: number | null
  type: string | null
  created_at: string
  is_flagged: boolean
  flag_reason: string | null
  flagged_at: string | null
  is_hidden: boolean
  user_id: string
  profiles: { display_name: string | null; username: string | null } | null
}

// ─── Sellers ─────────────────────────────────────────────────────────────────

async function fetchAdminSellers(): Promise<AdminSeller[]> {
  const res = await fetch('/api/admin/sellers')
  if (!res.ok) throw new Error('Failed to fetch sellers')
  return res.json()
}

export function useAdminSellers() {
  return useQuery({ queryKey: qk.adminSellers(), queryFn: fetchAdminSellers })
}

type SellerAction = 'approve' | 'flag' | 'ban' | 'unflag' | 'unban'

export function useSellerAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: SellerAction; reason?: string }) =>
      fetch(`/api/admin/sellers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      }).then((r) => { if (!r.ok) throw new Error('Failed') }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminSellers() })
      qc.invalidateQueries({ queryKey: qk.adminListings() })
    },
  })
}

// ─── Listings ────────────────────────────────────────────────────────────────

async function fetchAdminListings(): Promise<AdminListing[]> {
  const res = await fetch('/api/admin/listings')
  if (!res.ok) throw new Error('Failed to fetch listings')
  return res.json()
}

export function useAdminListings() {
  return useQuery({ queryKey: qk.adminListings(), queryFn: fetchAdminListings })
}

export function useListingAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'flag' | 'unflag'; reason?: string }) =>
      fetch(`/api/admin/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      }).then((r) => { if (!r.ok) throw new Error('Failed') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminListings() }),
  })
}

export function useDeleteListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/listings/${id}`, { method: 'DELETE' })
        .then((r) => { if (!r.ok) throw new Error('Failed') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminListings() }),
  })
}
