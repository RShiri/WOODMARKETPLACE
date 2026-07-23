'use server'

import { getCurrentProfile } from '@/lib/auth/session'
import { placeOrder as placeOrderService, type PlaceOrderResult } from '@/lib/orders/service'
import { checkoutSchema, type CheckoutInput } from '@/lib/validations/checkout'

export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  // Optional: if the buyer is logged in, attach the order to their account
  // so it shows up in /account order history. Checkout itself never
  // requires a session.
  const session = await getCurrentProfile()

  return placeOrderService(parsed.data, session?.userId ?? null)
}
