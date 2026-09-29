import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { qk } from './key'

export type AdminPerfume = {
  id: string
  slug: string
  name: string
  brand: string
  meta_title: string | null
  meta_description: string | null
  search_terms: string[]
  top_notes: string[]
  heart_notes: string[]
  base_notes: string[]
  accords: string[]
  gender_lean: string | null
  house_description: string | null
  is_verified: boolean
  authenticity_batch_code: string | null
  authenticity_packaging_notes: string | null
  authenticity_other_notes: string | null
}

export type AdminPerfumeUpdate = Partial<
  Pick<
    AdminPerfume,
    | 'slug'
    | 'name'
    | 'brand'
    | 'meta_title'
    | 'meta_description'
    | 'search_terms'
    | 'top_notes'
    | 'heart_notes'
    | 'base_notes'
    | 'accords'
    | 'gender_lean'
    | 'house_description'
    | 'is_verified'
    | 'authenticity_batch_code'
    | 'authenticity_packaging_notes'
    | 'authenticity_other_notes'
  >
>

export type AdminPerfumeCreate = Pick<AdminPerfume, 'name' | 'brand'> &
  Partial<
    Pick<
      AdminPerfume,
      | 'meta_title'
      | 'meta_description'
      | 'search_terms'
      | 'top_notes'
      | 'heart_notes'
      | 'base_notes'
      | 'accords'
      | 'gender_lean'
      | 'house_description'
      | 'authenticity_batch_code'
      | 'authenticity_packaging_notes'
      | 'authenticity_other_notes'
    >
  >

async function fetchAdminPerfumes(): Promise<AdminPerfume[]> {
  const res = await fetch('/api/admin/perfumes')
  if (!res.ok) throw new Error('Failed to fetch perfumes')
  return res.json()
}

export function useAdminPerfumes() {
  return useQuery({ queryKey: qk.adminPerfumes(), queryFn: fetchAdminPerfumes })
}

export function useAdminCreatePerfume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AdminPerfumeCreate) =>
      fetch('/api/admin/perfumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
        return r.json() as Promise<AdminPerfume>
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminPerfumes() })
      toast.success('Perfume created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAdminUpdatePerfume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: AdminPerfumeUpdate & { id: string }) =>
      fetch(`/api/admin/perfumes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
        return r.json() as Promise<AdminPerfume>
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminPerfumes() }),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAdminDeletePerfume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/perfumes/${id}`, { method: 'DELETE' }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminPerfumes() })
      toast.success('Perfume deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
