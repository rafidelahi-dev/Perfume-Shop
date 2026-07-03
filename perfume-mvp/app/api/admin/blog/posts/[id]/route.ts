import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select(`
      id, slug, title, excerpt, content, cover_image_url, status,
      author_id, rejection_note, published_at, created_at, updated_at,
      profiles(display_name, username),
      blog_post_categories(blog_categories(id, name, slug)),
      blog_post_tags(blog_tags(id, name, slug))
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  const body = await req.json()
  const { title, slug, excerpt, content, cover_image_url, status, rejection_note, category_ids, tag_ids } = body

  const supabase = createAdminClient()

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (slug !== undefined) updates.slug = slug
  if (excerpt !== undefined) updates.excerpt = excerpt
  if (content !== undefined) updates.content = content
  if (cover_image_url !== undefined) updates.cover_image_url = cover_image_url
  if (status !== undefined) {
    updates.status = status
    if (status === 'published') updates.published_at = new Date().toISOString()
    if (status === 'rejected') updates.rejection_note = rejection_note ?? null
  }

  const { data: post, error } = await supabase
    .from('blog_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (category_ids !== undefined) {
    await supabase.from('blog_post_categories').delete().eq('post_id', id)
    if (category_ids.length) {
      await supabase.from('blog_post_categories').insert(
        category_ids.map((cid: string) => ({ post_id: id, category_id: cid }))
      )
    }
  }
  if (tag_ids !== undefined) {
    await supabase.from('blog_post_tags').delete().eq('post_id', id)
    if (tag_ids.length) {
      await supabase.from('blog_post_tags').insert(
        tag_ids.map((tid: string) => ({ post_id: id, tag_id: tid }))
      )
    }
  }

  return NextResponse.json(post)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
