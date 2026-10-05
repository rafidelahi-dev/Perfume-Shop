import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

const SELECT_FIELDS =
  'id, slug, name, brand, meta_title, meta_description, search_terms, top_notes, heart_notes, base_notes, accords, gender_lean, house_description, is_verified, authenticity_batch_code, authenticity_packaging_notes, authenticity_other_notes, images'

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('perfumes')
    .select(SELECT_FIELDS)
    .order('is_verified', { ascending: true })
    .order('brand', { ascending: true })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const brand = typeof body.brand === 'string' ? body.brand.trim() : ''
  if (!name || !brand) {
    return NextResponse.json({ error: 'name and brand are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const baseSlug = slugify(name)
  let slug = baseSlug
  let suffix = 2
  while (true) {
    const { data: existing, error: slugError } = await supabase
      .from('perfumes')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (slugError) return NextResponse.json({ error: slugError.message }, { status: 500 })
    if (!existing) break
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  const insertRow = {
    slug,
    name,
    brand,
    meta_title: typeof body.meta_title === 'string' ? body.meta_title : null,
    meta_description: typeof body.meta_description === 'string' ? body.meta_description : null,
    search_terms: Array.isArray(body.search_terms) ? body.search_terms : [],
    top_notes: Array.isArray(body.top_notes) ? body.top_notes : [],
    heart_notes: Array.isArray(body.heart_notes) ? body.heart_notes : [],
    base_notes: Array.isArray(body.base_notes) ? body.base_notes : [],
    accords: Array.isArray(body.accords) ? body.accords : [],
    gender_lean: typeof body.gender_lean === 'string' ? body.gender_lean : null,
    house_description: typeof body.house_description === 'string' ? body.house_description : null,
    images: Array.isArray(body.images) ? body.images.filter((u) => typeof u === 'string') : [],
    is_verified: false,
    authenticity_batch_code: typeof body.authenticity_batch_code === 'string' ? body.authenticity_batch_code : null,
    authenticity_packaging_notes:
      typeof body.authenticity_packaging_notes === 'string' ? body.authenticity_packaging_notes : null,
    authenticity_other_notes: typeof body.authenticity_other_notes === 'string' ? body.authenticity_other_notes : null,
  }

  const { data, error } = await supabase.from('perfumes').insert(insertRow).select(SELECT_FIELDS).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
