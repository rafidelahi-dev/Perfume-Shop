import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

type Action = 'approve' | 'flag' | 'ban' | 'unflag' | 'unban'

const STATUS_MAP: Record<Action, string> = {
  approve: 'active',
  flag: 'flagged',
  ban: 'banned',
  unflag: 'active',
  unban: 'active',
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  let body: { action: Action; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { action, reason } = body

  const validActions: Action[] = ['approve', 'flag', 'ban', 'unflag', 'unban']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const update: Record<string, unknown> = {
    status: STATUS_MAP[action],
    status_updated_at: new Date().toISOString(),
    flag_reason: null,
    ban_reason: null,
  }

  if (action === 'flag') update.flag_reason = reason ?? null
  if (action === 'ban') update.ban_reason = reason ?? null

  const { error } = await supabase.from('profiles').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (action === 'ban') {
    const { error: cascadeErr } = await supabase
      .from('listings').update({ is_hidden: true }).eq('user_id', id)
    if (cascadeErr) return NextResponse.json({ error: cascadeErr.message }, { status: 500 })
  }
  if (action === 'unban') {
    const { error: cascadeErr } = await supabase
      .from('listings').update({ is_hidden: false }).eq('user_id', id)
    if (cascadeErr) return NextResponse.json({ error: cascadeErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
