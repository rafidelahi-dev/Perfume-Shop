import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'
import { revalidatePath } from 'next/cache'

type Action = 'flag' | 'ban' | 'unflag' | 'unban'

const STATUS_MAP: Record<Action, string> = {
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
  let body: { action?: Action; reason?: string; tier_frozen?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { action, reason } = body

  // Tier freeze is its own toggle: hides the seller's earned tier on profile and card.
  if (body.tier_frozen !== undefined) {
    if (typeof body.tier_frozen !== 'boolean') {
      return NextResponse.json({ error: 'tier_frozen must be a boolean' }, { status: 400 })
    }
    const sb = createAdminClient()
    const { data, error: fErr } = await sb
      .from('profiles').update({ tier_frozen: body.tier_frozen }).eq('id', id).select('username').single()
    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 })
    if (data?.username) revalidatePath(`/perfumes/${data.username}`)
    return NextResponse.json({ ok: true })
  }

  const validActions: Action[] = ['flag','ban', 'unflag', 'unban']
  if (!action || !validActions.includes(action)) {
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
