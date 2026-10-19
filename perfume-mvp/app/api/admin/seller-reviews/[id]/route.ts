import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

type Action = 'unflag' | 'hide' | 'unhide'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  let body: { action: Action }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<Action, Record<string, unknown>> = {
    unflag: { is_flagged: false, flag_reason: null, flagged_at: null },
    hide: { is_hidden: true },
    unhide: { is_hidden: false },
  }
  const update = updates[body.action]
  if (!update) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('seller_reviews').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('seller_reviews').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
