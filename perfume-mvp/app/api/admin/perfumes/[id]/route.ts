import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  const body = await req.json()
  const { top_notes, heart_notes, base_notes, accords, gender_lean, house_description, is_verified } = body

  const supabase = createAdminClient()
  const updates: Record<string, unknown> = {}
  if (top_notes !== undefined) updates.top_notes = top_notes
  if (heart_notes !== undefined) updates.heart_notes = heart_notes
  if (base_notes !== undefined) updates.base_notes = base_notes
  if (accords !== undefined) updates.accords = accords
  if (gender_lean !== undefined) updates.gender_lean = gender_lean
  if (house_description !== undefined) updates.house_description = house_description
  if (is_verified !== undefined) updates.is_verified = is_verified

  const { data, error } = await supabase
    .from('perfumes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
