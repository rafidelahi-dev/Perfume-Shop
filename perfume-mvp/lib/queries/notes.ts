import { createPublicSupabase } from './perfumes'

export const normalizeNote = (n: string) => n.trim().toLowerCase()

/** name -> image url, only for notes that have an image. */
export async function fetchNoteImages(names: string[]): Promise<Record<string, string>> {
  const keys = [...new Set(names.map(normalizeNote).filter(Boolean))]
  if (keys.length === 0) return {}
  const { data, error } = await createPublicSupabase()
    .from('notes')
    .select('name, image_url')
    .in('name', keys)
    .not('image_url', 'is', null)
  if (error) {
    console.error('[notes] fetchNoteImages failed:', error.message)
    return {}
  }
  return Object.fromEntries((data ?? []).map((r) => [r.name, r.image_url as string]))
}
