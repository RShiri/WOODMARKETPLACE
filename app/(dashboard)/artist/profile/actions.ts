'use server'

import { createClient } from '@/lib/supabase/server'
import { artistProfileSchema } from '@/lib/validations/artist-profile'

type ActionResult = { error: string } | { success: true }

/**
 * Re-verifies the caller server-side (never trust the client for identity)
 * and returns their user id. Does not redirect — callers here are server
 * actions invoked from a form, and want to return a typed error to the
 * client instead of triggering a navigation.
 */
async function requireUserId(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to do that.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'artist') {
    return { error: 'Only artists can update a shop profile.' }
  }

  return { userId: user.id }
}

/**
 * Updates the caller's shop name, bio, and location. Only these three
 * fields are accepted from user input — `slug` and `is_verified` are never
 * read from `input`, so a crafted client payload can't touch them.
 */
export async function updateArtistProfile(input: {
  shopName: string
  bio: string | null
  location: string | null
}): Promise<ActionResult> {
  const parsed = artistProfileSchema.safeParse({
    shopName: input.shopName,
    bio: input.bio ?? '',
    location: input.location ?? '',
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const auth = await requireUserId()
  if ('error' in auth) return auth

  const supabase = await createClient()
  const { error } = await supabase
    .from('artist_profiles')
    .update({
      shop_name: parsed.data.shopName,
      bio: parsed.data.bio ? parsed.data.bio : null,
      location: parsed.data.location ? parsed.data.location : null,
    })
    .eq('id', auth.userId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/** Updates the caller's banner_url after they've uploaded a new image client-side. */
export async function updateArtistBanner(bannerUrl: string): Promise<ActionResult> {
  if (!bannerUrl || typeof bannerUrl !== 'string') {
    return { error: 'Invalid banner URL' }
  }

  const auth = await requireUserId()
  if ('error' in auth) return auth

  const supabase = await createClient()
  const { error } = await supabase
    .from('artist_profiles')
    .update({ banner_url: bannerUrl })
    .eq('id', auth.userId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
