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
      id, perfume_name, brand, rating, review_text, owns_bottle, created_at,
      is_flagged, flag_reason, flagged_at, is_hidden, user_id,
      profiles(display_name, username)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
