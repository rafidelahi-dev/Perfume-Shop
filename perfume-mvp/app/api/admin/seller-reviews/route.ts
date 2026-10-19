import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('seller_reviews')
    .select(`
      id, rating, comment, created_at, is_flagged, flag_reason, is_hidden,
      seller:profiles!seller_reviews_seller_id_fkey(display_name, username),
      reviewer:profiles!seller_reviews_reviewer_id_fkey(display_name, username)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
