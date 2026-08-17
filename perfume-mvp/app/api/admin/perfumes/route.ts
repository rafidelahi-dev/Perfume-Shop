import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('perfumes')
    .select('id, slug, name, brand, top_notes, heart_notes, base_notes, accords, gender_lean, house_description, is_verified')
    .order('is_verified', { ascending: true })
    .order('brand', { ascending: true })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
