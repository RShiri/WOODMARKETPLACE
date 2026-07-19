import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Handles the redirect from Supabase Auth email confirmation / magic links.
 * Exchanges the `code` query param for a session, then redirects to the
 * `next` param (defaulting to `/`) on success, or back to `/login` with an
 * error flag on failure.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
