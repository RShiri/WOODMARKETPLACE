'use server'

import { redirect } from 'next/navigation'

import { requireCustomerProfile } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { createInquirySchema, type CreateInquiryInput } from '@/lib/validations/inquiry'
import type { InquiryStatus } from '@/types/database.types'

type ActionResult = { error: string } | { success: true }

const MESSAGE_MIN_LENGTH = 1
const MESSAGE_MAX_LENGTH = 4000

/**
 * Sends a message on an existing inquiry thread. Usable by either party
 * (customer or artist) — RLS on `inquiry_messages` already restricts inserts
 * to callers who are a party to the inquiry and who set `sender_id` to
 * themselves, so this only needs to validate the message body and attach
 * the caller's own id.
 */
export async function sendInquiryMessage(
  inquiryId: string,
  body: string
): Promise<ActionResult> {
  const trimmed = body.trim()

  if (trimmed.length < MESSAGE_MIN_LENGTH) {
    return { error: 'Message cannot be empty.' }
  }

  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    return { error: `Message is too long (max ${MESSAGE_MAX_LENGTH} characters).` }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.from('inquiry_messages').insert({
    inquiry_id: inquiryId,
    sender_id: user.id,
    body: trimmed,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Updates an inquiry's status (e.g. an artist marking it "quoted" or
 * "accepted", a customer "cancelled"). Both parties are RLS-permitted to
 * update status for MVP simplicity — there is no extra app-layer role
 * restriction here beyond "you are a party to this inquiry", which the
 * `custom_order_inquiries_update_party` RLS policy already enforces.
 */
export async function updateInquiryStatus(
  inquiryId: string,
  status: InquiryStatus
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('custom_order_inquiries')
    .update({ status })
    .eq('id', inquiryId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Creates a new custom order inquiry from a customer to an artist, optionally
 * tied to a specific product (a general shop inquiry omits `productId`).
 * Requires a signed-in customer — an unauthenticated visitor clicking
 * "Request Custom Order" is redirected to /login by `requireCustomerProfile()`,
 * which is the desired behavior here rather than a soft error.
 */
export async function createInquiry(
  input: CreateInquiryInput
): Promise<{ error: string } | { success: true; id: string }> {
  const parsed = createInquirySchema.safeParse(input)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid request details.' }
  }

  const { userId } = await requireCustomerProfile()

  const { artistId, productId, description, budgetMinDollars, budgetMaxDollars } = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('custom_order_inquiries')
    .insert({
      customer_id: userId,
      artist_id: artistId,
      product_id: productId ?? null,
      description,
      budget_min_cents:
        budgetMinDollars !== undefined ? Math.round(budgetMinDollars * 100) : null,
      budget_max_cents:
        budgetMaxDollars !== undefined ? Math.round(budgetMaxDollars * 100) : null,
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  return { success: true, id: data.id }
}
