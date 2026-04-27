import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

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
  const { id } = await params
  const { action, reason }: { action: Action; reason?: string } = await req.json()
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
    await supabase.from('listings').update({ is_hidden: true }).eq('user_id', id)
  }
  if (action === 'unban') {
    await supabase.from('listings').update({ is_hidden: false }).eq('user_id', id)
  }

  return NextResponse.json({ ok: true })
}
