import 'server-only'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createServerSupabase } from './supabaseServer'
import { createAdminClient } from './supabaseAdmin'

type AdminCheck =
  | { user: User; response: null }
  | { user: null; response: NextResponse }

/**
 * Guard for /api/admin/* routes. Returns the authenticated admin user,
 * or a ready-to-return 401/403 response.
 *
 * Usage:
 *   const { user, response } = await requireAdmin()
 *   if (response) return response
 */
export async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Role lookup via service role so RLS can never hide the row
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { user: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, response: null }
}

/** Guard for routes that just need any signed-in user. */
export async function requireUser(): Promise<AdminCheck> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user, response: null }
}
