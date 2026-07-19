import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '@/types/database.types'

/**
 * Refreshes the Supabase auth session on every matching request and returns
 * a `NextResponse` carrying the refreshed session cookies, along with the
 * (re-validated) authenticated user, if any.
 *
 * This only handles session refresh — route protection/redirect logic lives
 * in the root `middleware.ts`, which calls this helper and then applies its
 * own auth rules on top of the returned response using the returned `user`.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Do not use `getSession()` here — it only reads the (possibly stale) JWT
  // from the cookie without verifying it. `getUser()` revalidates the token
  // against the Supabase Auth server on every request, which is what
  // actually refreshes an expiring session and is safe to trust server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return { response: supabaseResponse, user }
}
