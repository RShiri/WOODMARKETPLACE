'use server'

import { redirect } from 'next/navigation'

import { getServerDictionary } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'
import type { LoginInput, RegisterInput, RequestResetInput, ResetPasswordInput } from '@/lib/validations/auth'
import { loginSchema, registerSchema, requestResetSchema, resetPasswordSchema } from '@/lib/validations/auth'

type ActionResult = { error: string } | { message: string } | void

export async function login(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }
  const { email, password } = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }
  if (!data.user) {
    return { error: 'Could not sign in. Please try again.' }
  }

  redirect('/account')
}

export async function signup(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }
  const { email, password, fullName } = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (error) {
    return { error: error.message }
  }
  if (!data.user) {
    return { error: 'Could not create your account. Please try again.' }
  }
  if (!data.session) {
    return { message: 'Check your email to confirm your account.' }
  }

  redirect('/account')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

/**
 * Always returns a generic success message regardless of whether the email
 * has an account — never confirm/deny account existence to an unauthenticated
 * caller, that's an account enumeration leak.
 */
export async function requestPasswordReset(input: RequestResetInput): Promise<ActionResult> {
  const parsed = requestResetSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  })

  return { message: getServerDictionary().auth.resetEmailSentMessage }
}

/**
 * Only works with an active recovery session — i.e. after following the
 * emailed reset link, which the callback route exchanges for a session
 * before redirecting here. No separate "old password" check is needed:
 * possessing a valid recovery session already proves email ownership.
 */
export async function updatePassword(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'This reset link has expired. Please request a new one.' }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return { error: error.message }
  }

  redirect('/account')
}
