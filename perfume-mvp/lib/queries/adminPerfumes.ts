import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { qk } from './key'

export type AdminPerfume = {
  id: string
  slug: string
  name: string
  brand: string
  top_notes: string[]
  heart_notes: string[]
  base_notes: string[]
  accords: string[]
  gender_lean: string | null
  house_description: string | null
  is_verified: boolean
}

export type AdminPerfumeUpdate = Partial<
  Pick<AdminPerfume, 'top_notes' | 'heart_notes' | 'base_notes' | 'accords' | 'gender_lean' | 'house_description' | 'is_verified'>
>

async function fetchAdminPerfumes(): Promise<AdminPerfume[]> {
  const res = await fetch('/api/admin/perfumes')
  if (!res.ok) throw new Error('Failed to fetch perfumes')
  return res.json()
}

export function useAdminPerfumes() {
  return useQuery({ queryKey: qk.adminPerfumes(), queryFn: fetchAdminPerfumes })
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
