import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

// Public-read data (RLS: blog_tags_public_read) — also used by the seller editor.
export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_tags')
    .select('id, name, slug')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin()
  if (response) return response

  const { name, slug } = await req.json()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_tags')
    .insert({ name, slug })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
