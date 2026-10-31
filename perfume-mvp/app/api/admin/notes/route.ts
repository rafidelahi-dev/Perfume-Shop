import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const { data, error } = await createAdminClient()
    .from('notes')
    .select('name, image_url, name_bn')
    .order('name')
    .limit(2000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Set or clear the image (image_url) and/or Bangla name (name_bn) of one note.
export async function PATCH(req: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name : ''
  const update: { image_url?: string | null; name_bn?: string | null } = {}
  if ('image_url' in (body ?? {})) {
    if (body.image_url !== null && typeof body.image_url !== 'string') {
      return NextResponse.json({ error: 'image_url must be a string or null' }, { status: 400 })
    }
    update.image_url = body.image_url
  }
  if ('name_bn' in (body ?? {})) {
    if (body.name_bn !== null && typeof body.name_bn !== 'string') {
      return NextResponse.json({ error: 'name_bn must be a string or null' }, { status: 400 })
    }
    update.name_bn = body.name_bn?.trim().slice(0, 80) || null
  }
  if (!name || Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'name and image_url or name_bn required' }, { status: 400 })
  }

  const { data, error } = await createAdminClient()
    .from('notes')
    .update(update)
    .eq('name', name)
    .select('name, image_url, name_bn')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

  // Note images and names appear on every perfume page that uses the note.
  revalidatePath('/fragrance/[slug]', 'page')
  return NextResponse.json(data)
}
