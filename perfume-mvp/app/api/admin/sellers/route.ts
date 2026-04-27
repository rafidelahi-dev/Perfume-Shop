import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, username, display_name, contact_number, whatsapp_number,
      facebook_link, bio, location, avatar_url,
      status, flag_reason, ban_reason, status_updated_at, created_at,
      listings(count)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sellers = (data ?? []).map((s) => ({
    ...s,
    listing_count: (s.listings as unknown as { count: number }[])?.[0]?.count ?? 0,
    listings: undefined,
  }))

  return NextResponse.json(sellers)
}
