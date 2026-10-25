import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export type NoteRow = { name: string; image_url: string | null }

const KEY = ['admin', 'notes'] as const

export function useAdminNotes() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<NoteRow[]> => {
      const res = await fetch('/api/admin/notes')
      if (!res.ok) throw new Error('Failed to fetch notes')
      return res.json()
    },
  })
}

export function useSetNoteImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, image_url }: { name: string; image_url: string | null }) =>
      fetch('/api/admin/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image_url }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
        return r.json() as Promise<NoteRow>
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success('Note image saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
