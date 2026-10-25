import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET() {
  const { response } = await requireAdmin()
  if (response) return response

  const { data, error } = await createAdminClient()
    .from('notes')
    .select('name, image_url')
    .order('name')
    .limit(2000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Set or clear (image_url: null) the image of one note.
export async function PATCH(req: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name : ''
  const image_url = body?.image_url
  if (!name || (image_url !== null && typeof image_url !== 'string')) {
    return NextResponse.json({ error: 'name and image_url required' }, { status: 400 })
  }

  const { data, error } = await createAdminClient()
    .from('notes')
    .update({ image_url })
    .eq('name', name)
    .select('name, image_url')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

  // Note images appear on every perfume page that uses the note.
  revalidatePath('/fragrance/[slug]', 'page')
  return NextResponse.json(data)
}
