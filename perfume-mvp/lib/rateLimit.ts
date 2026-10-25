import 'server-only'

import { createAdminClient } from '@/lib/supabaseAdmin'

/**
 * Shared rate limiter backed by the rate_limit_hit() Postgres function
 * (supabase/rate-limits.sql), so every server instance sees the same counts.
 * If the database call fails it falls back to a per-instance in-memory window
 * rather than blocking real users.
 */
const buckets = new Map<string, number[]>()

export function memoryRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart)

  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }

  hits.push(now)
  buckets.set(key, hits)

  // Opportunistic cleanup so the map doesn't grow unbounded
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => t <= windowStart)) buckets.delete(k)
    }
  }
  return true
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc('rate_limit_hit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: Math.ceil(windowMs / 1000),
  })
  if (error || typeof data !== 'boolean') {
    console.error('[rateLimit] database limiter failed, using memory:', error?.message)
    return memoryRateLimit(key, limit, windowMs)
  }
  return data
}

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export function tooManyRequests(message = 'Too many requests, please try again later.') {
  return Response.json({ error: message }, { status: 429 })
}
