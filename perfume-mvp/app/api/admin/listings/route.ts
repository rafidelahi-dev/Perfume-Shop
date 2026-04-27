import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('listings')
    .select(`
      id, perfume_name, brand, price, type, created_at,
      is_flagged, flag_reason, flagged_at, is_hidden, user_id,
      profiles(display_name, username)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
