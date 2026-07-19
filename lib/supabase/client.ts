import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/types/database.types'

/**
 * Supabase client for use in Client Components ("use client").
 * Creates a new browser client bound to cookies for session storage.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
