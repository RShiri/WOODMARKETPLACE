import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database.types'

export async function getCurrentProfile(): Promise<{ userId: string; email: string | null; profile: Profile } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (!profile) return null

  return { userId: user.id, email: user.email ?? null, profile }
}

/** Redirects to /login if there is no authenticated session. Used only by /account (order history) — checkout itself is guest-friendly. */
export async function requireProfile() {
  const session = await getCurrentProfile()
  if (!session) redirect('/login')
  return session
}

/** Redirects non-admins to /login (or / if logged in as something else). Gates /admin/*. */
export async function requireAdminProfile() {
  const session = await requireProfile()
  if (session.profile.role !== 'admin') redirect('/')
  return session
}
