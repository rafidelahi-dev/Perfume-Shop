import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireUser } from '@/lib/adminAuth'
import { rateLimit, tooManyRequests } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser()
  if (response) return response

  if (!rateLimit(`upload:${user.id}`, 30, 60 * 60 * 1000)) {
    return tooManyRequests('Upload limit reached, try again in an hour.')
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const postId = formData.get('postId') as string | null
  const type = (formData.get('type') as string | null) ?? 'inline'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowed = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const id = postId ?? `tmp-${user.id}`
  const path =
    type === 'cover'
      ? `covers/${id}/${Date.now()}.${ext}`
      : `${id}/${Date.now()}.${ext}`

  const supabase = createAdminClient()

  // Ensure bucket exists (SQL editor can't always create storage buckets)
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.find((b) => b.id === 'blog-images')) {
    const { error: bucketErr } = await supabase.storage.createBucket('blog-images', {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    })
    if (bucketErr) {
      return NextResponse.json({ error: `Storage bucket error: ${bucketErr.message}` }, { status: 500 })
    }
  }

  const { error } = await supabase.storage
    .from('blog-images')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
