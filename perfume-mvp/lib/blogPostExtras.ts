import type { SupabaseClient } from '@supabase/supabase-js'

export type FaqItem = { q: string; a: string }

export function sanitizeFaq(input: unknown): FaqItem[] {
  if (!Array.isArray(input)) return []
  return input
    .map((x) => ({
      q: typeof x?.q === 'string' ? x.q.trim() : '',
      a: typeof x?.a === 'string' ? x.a.trim() : '',
    }))
    .filter((x) => x.q && x.a)
    .slice(0, 20)
}

export function sanitizeSlugs(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return [...new Set(input.filter((s): s is string => typeof s === 'string' && s.trim() !== ''))].slice(0, 10)
}

export async function getInternalNotes(supabase: SupabaseClient, postId: string): Promise<string> {
  const { data } = await supabase
    .from('blog_post_internal_notes')
    .select('notes')
    .eq('post_id', postId)
    .maybeSingle()
  return data?.notes ?? ''
}

export async function saveInternalNotes(supabase: SupabaseClient, postId: string, notes: string) {
  await supabase
    .from('blog_post_internal_notes')
    .upsert({ post_id: postId, notes, updated_at: new Date().toISOString() })
}
