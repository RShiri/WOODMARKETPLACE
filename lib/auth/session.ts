import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { ArtistProfile, Profile } from '@/types/database.types'

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

/** Redirects to /login if there is no authenticated session. */
export async function requireProfile() {
  const session = await getCurrentProfile()
  if (!session) redirect('/login')
  return session
}

/** Redirects non-artists away; returns the caller's artist_profiles row alongside their profile. */
export async function requireArtistProfile(): Promise<{
  userId: string
  email: string | null
  profile: Profile
  artistProfile: ArtistProfile
}> {
  const session = await requireProfile()
  if (session.profile.role !== 'artist') redirect('/shop')

  const supabase = await createClient()
  const { data: artistProfile } = await supabase
    .from('artist_profiles')
    .select('*')
    .eq('id', session.userId)
    .single()

  if (!artistProfile) redirect('/login')

  return { ...session, artistProfile }
}

/** Redirects non-customers away (used to gate customer-only pages like /checkout). */
export async function requireCustomerProfile() {
  const session = await requireProfile()
  if (session.profile.role !== 'customer') redirect('/artist/products')
  return session
}
