import 'server-only'

/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Per-instance only (serverless instances each keep their own window), so this
 * is abuse mitigation, not a hard guarantee. Good enough for OTP/email/upload
 * endpoints at MVP scale; swap for Upstash/Redis if traffic grows.
 */
const buckets = new Map<string, number[]>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
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

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export function tooManyRequests(message = 'Too many requests, please try again later.') {
  return Response.json({ error: message }, { status: 429 })
}
