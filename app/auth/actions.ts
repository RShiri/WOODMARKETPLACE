'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { LoginInput, RegisterInput } from '@/lib/validations/auth'
import { loginSchema, registerSchema } from '@/lib/validations/auth'

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
