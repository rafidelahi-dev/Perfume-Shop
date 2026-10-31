import { createPublicSupabase } from './perfumes'

export const normalizeNote = (n: string) => n.trim().toLowerCase()

export type NoteInfo = { image?: string; bn?: string }

/** name -> image url / Bangla name, only for notes that have either. */
export async function fetchNoteInfo(names: string[]): Promise<Record<string, NoteInfo>> {
  const keys = [...new Set(names.map(normalizeNote).filter(Boolean))]
  if (keys.length === 0) return {}
  const { data, error } = await createPublicSupabase()
    .from('notes')
    .select('name, image_url, name_bn')
    .in('name', keys)
    .or('image_url.not.is.null,name_bn.not.is.null')
  if (error) {
    console.error('[notes] fetchNoteInfo failed:', error.message)
    return {}
  }
  return Object.fromEntries(
    (data ?? []).map((r) => [r.name, { image: r.image_url ?? undefined, bn: r.name_bn ?? undefined }]),
  )
}
