import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.types'

/**
 * Service-role Supabase client for server-only code (API routes, the
 * WhatsApp webhook, server actions). Bypasses RLS entirely — this is the
 * ONLY client that may read/write `quotes`, `wa_sessions`, and `wa_messages`,
 * since those tables intentionally have no public/authenticated RLS
 * policies. Never import this from a Client Component or expose the key to
 * the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — required for server-side quote/order/WhatsApp operations.'
    )
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
