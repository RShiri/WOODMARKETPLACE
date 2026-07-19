import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/types/database.types'

/**
 * Supabase client for use in Server Components and Server Actions.
 * Must be created fresh on every call (per-request) because it reads the
 * request's cookies via `cookies()` from `next/headers`.
 *
 * Note: `cookies()` is synchronous in Next.js 14's App Router API.
 */
export async function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user
            // sessions (see `lib/supabase/middleware.ts` + root `middleware.ts`),
            // since Server Components cannot write cookies and the middleware
            // is what actually persists the refreshed session.
          }
        },
      },
    }
  )
}
