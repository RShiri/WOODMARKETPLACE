'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { LoginInput, RegisterInput } from '@/lib/validations/auth'
import { loginSchema, registerSchema } from '@/lib/validations/auth'

type ActionResult = { error: string } | { message: string } | void

/**
 * Derives a URL-safe slug from a shop name and appends a short random
 * suffix (derived from the user's id) to avoid colliding with the unique
 * constraint on `artist_profiles.slug`.
 */
function deriveSlug(shopName: string, userId: string): string {
  const base = shopName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  const suffix = userId.replace(/-/g, '').slice(0, 6)

  return `${base || 'shop'}-${suffix}`
}

function redirectForRole(role: 'customer' | 'artist' | 'admin'): never {
  if (role === 'artist') {
    redirect('/artist/products')
  }
  redirect('/shop')
}

export async function login(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }
  const { email, password } = parsed.data

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: 'Could not sign in. Please try again.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'Signed in, but could not load your profile. Please try again.' }
  }

  redirectForRole(profile.role)
}

export async function signup(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }
  const { email, password, fullName, role, shopName } = parsed.data

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        full_name: fullName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: 'Could not create your account. Please try again.' }
  }

  if (role === 'artist') {
    const slug = deriveSlug(shopName ?? '', data.user.id)

    const { error: artistProfileError } = await supabase.from('artist_profiles').insert({
      id: data.user.id,
      shop_name: shopName ?? '',
      slug,
    })

    if (artistProfileError) {
      return {
        error: `Account created, but we couldn't set up your shop profile: ${artistProfileError.message}`,
      }
    }
  }

  if (!data.session) {
    return { message: 'Check your email to confirm your account.' }
  }

  redirectForRole(role)
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
