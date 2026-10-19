import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  let body: { action: 'flag' | 'unflag' | 'hide' | 'unhide'; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { action, reason } = body
  const supabase = createAdminClient()

  const validActions = ['flag', 'unflag', 'hide', 'unhide'] as const
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const update =
    action === 'flag'
      ? { is_flagged: true, flag_reason: reason ?? null, flagged_at: new Date().toISOString() }
      : action === 'unflag'
        ? { is_flagged: false, flag_reason: null, flagged_at: null }
        : { is_hidden: action === 'hide' }

  const { error } = await supabase.from('reviews').update(update).eq('id', id)
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
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
