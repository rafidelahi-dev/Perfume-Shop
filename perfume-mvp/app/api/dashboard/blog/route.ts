import { NextRequest, NextResponse } from 'next/server'
import { sanitizeFaq, sanitizeSlugs, getInternalNotes, saveInternalNotes } from '@/lib/blogPostExtras'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { createServerSupabase } from '@/lib/supabaseServer'

export async function GET() {
  const serverSupabase = await createServerSupabase()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select(`
      id, slug, title, excerpt, meta_title, meta_description, cover_image_url, status,
      rejection_note, published_at, created_at, updated_at,
      blog_post_categories(blog_categories(id, name, slug)),
      blog_post_tags(blog_tags(id, name, slug))
    `)
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const serverSupabase = await createServerSupabase()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, slug, excerpt, meta_title, meta_description, faq, fragrance_slugs, internal_notes, content, cover_image_url, category_ids, tag_ids } = body

  const supabase = createAdminClient()

  const { data: post, error } = await supabase
    .from('blog_posts')
    .insert({
      title,
      slug,
      excerpt,
      meta_title: meta_title?.trim() || null,
      meta_description: meta_description?.trim() || null,
      faq: sanitizeFaq(faq),
      fragrance_slugs: sanitizeSlugs(fragrance_slugs),
      content,
      cover_image_url: cover_image_url ?? null,
      status: 'draft',
      author_id: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (typeof internal_notes === 'string' && internal_notes.trim()) {
    await saveInternalNotes(supabase, post.id, internal_notes)
  }

  if (category_ids?.length) {
    await supabase.from('blog_post_categories').insert(
      category_ids.map((cid: string) => ({ post_id: post.id, category_id: cid }))
    )
  }
  if (tag_ids?.length) {
    await supabase.from('blog_post_tags').insert(
      tag_ids.map((tid: string) => ({ post_id: post.id, tag_id: tid }))
    )
  }

  return NextResponse.json(post, { status: 201 })
}
