import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { createServerSupabase } from '@/lib/supabaseServer'

type Params = { params: Promise<{ id: string }> }

async function getAuthedUser() {
  const serverSupabase = await createServerSupabase()
  const { data: { user } } = await serverSupabase.auth.getUser()
  return user
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select(`
      id, slug, title, excerpt, content, cover_image_url, status,
      rejection_note, published_at, created_at, updated_at,
      blog_post_categories(blog_categories(id, name, slug)),
      blog_post_tags(blog_tags(id, name, slug))
    `)
    .eq('id', id)
    .eq('author_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, slug, excerpt, content, cover_image_url, action, category_ids, tag_ids } = body

  const supabase = createAdminClient()

  // Verify ownership and editable status
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id, status, author_id')
    .eq('id', id)
    .eq('author_id', user.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['draft', 'rejected'].includes(existing.status) && action !== 'submit') {
    return NextResponse.json({ error: 'Cannot edit post in current status' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (slug !== undefined) updates.slug = slug
  if (excerpt !== undefined) updates.excerpt = excerpt
  if (content !== undefined) updates.content = content
  if (cover_image_url !== undefined) updates.cover_image_url = cover_image_url
  if (action === 'submit') updates.status = 'pending_review'

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
  const { id } = await params
  const user = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('blog_posts')
    .select('status, author_id')
    .eq('id', id)
    .eq('author_id', user.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['draft', 'rejected'].includes(existing.status)) {
    return NextResponse.json({ error: 'Cannot delete post in current status' }, { status: 403 })
  }

  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
