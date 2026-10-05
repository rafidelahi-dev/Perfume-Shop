import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  const body = await req.json()
  const {
    slug,
    name,
    brand,
    meta_title,
    meta_description,
    search_terms,
    top_notes,
    heart_notes,
    base_notes,
    accords,
    gender_lean,
    house_description,
    is_verified,
    authenticity_batch_code,
    authenticity_packaging_notes,
    authenticity_other_notes,
    images,
  } = body

  const supabase = createAdminClient()
  const updates: Record<string, unknown> = {}
  if (slug !== undefined) updates.slug = slug
  if (name !== undefined) updates.name = name
  if (brand !== undefined) updates.brand = brand
  if (meta_title !== undefined) updates.meta_title = meta_title
  if (meta_description !== undefined) updates.meta_description = meta_description
  if (search_terms !== undefined) updates.search_terms = search_terms
  if (top_notes !== undefined) updates.top_notes = top_notes
  if (heart_notes !== undefined) updates.heart_notes = heart_notes
  if (base_notes !== undefined) updates.base_notes = base_notes
  if (accords !== undefined) updates.accords = accords
  if (gender_lean !== undefined) updates.gender_lean = gender_lean
  if (house_description !== undefined) updates.house_description = house_description
  if (is_verified !== undefined) updates.is_verified = is_verified
  if (authenticity_batch_code !== undefined) updates.authenticity_batch_code = authenticity_batch_code
  if (authenticity_packaging_notes !== undefined) updates.authenticity_packaging_notes = authenticity_packaging_notes
  if (authenticity_other_notes !== undefined) updates.authenticity_other_notes = authenticity_other_notes
  if (Array.isArray(images)) updates.images = images.filter((u: unknown) => typeof u === 'string')

  const { data, error } = await supabase
    .from('perfumes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  const supabase = createAdminClient()

  const { count, error: listingsError } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('perfume_id', id)

  if (listingsError) return NextResponse.json({ error: listingsError.message }, { status: 500 })
  if (count && count > 0) {
    return NextResponse.json(
      { error: `${count} listing(s) still reference this perfume. Remove or reassign them first.` },
      { status: 409 },
    )
  }

  const { error } = await supabase.from('perfumes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
