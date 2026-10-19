import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id, rating, review_text, owns_bottle, created_at,
      is_flagged, flag_reason, flagged_at, is_hidden, user_id,
      profiles(display_name, username),
      perfumes(name, brand)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  type Row = { perfumes: { name: string; brand: string } | null } & Record<string, unknown>
  const rows = ((data ?? []) as unknown as Row[]).map(({ perfumes, ...r }) => ({
    ...r,
    perfume_name: perfumes?.name ?? '',
    brand: perfumes?.brand ?? '',
  }))
  return NextResponse.json(rows)
}
