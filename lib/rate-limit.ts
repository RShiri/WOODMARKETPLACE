import { createAdminClient } from '@/lib/supabase/admin'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: Date
}

/**
 * Fixed-window rate limit backed by Postgres (see
 * supabase/migrations/0005_rate_limits.sql). The increment is a single
 * atomic upsert (increment_rate_limit RPC), so concurrent requests in the
 * same window can't race past the limit the way a read-then-write check
 * would. Old windows are opportunistically cleaned up so the table stays
 * small without needing a separate cron job.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const supabase = createAdminClient()
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs)
  const resetAt = new Date(windowStart.getTime() + windowMs)

  const { data: newCount, error } = await supabase.rpc('increment_rate_limit', {
    p_bucket_key: key,
    p_window_start: windowStart.toISOString(),
  })

  if (error) {
    // Fail open: a rate-limit outage shouldn't take down the calculator or bot.
    console.error('Rate limit check failed, allowing request', error)
    return { allowed: true, remaining: limit, limit, resetAt }
  }

  // Opportunistic cleanup — best-effort, never blocks the response.
  void supabase
    .from('rate_limit_hits')
    .delete()
    .lt('window_start', new Date(now - 60 * 60 * 1000).toISOString())

  const count = newCount as number
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    limit,
    resetAt,
  }
}
