import { createAdminClient } from '@/lib/supabase/admin'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { getQuoteById, isQuoteExpired } from '@/lib/pricing/quote-service'
import type { BaseType } from '@/lib/pricing/engine'
import type { CheckoutInput } from '@/lib/validations/checkout'
import type { Order } from '@/types/database.types'

export type PlaceOrderResult = { error: string } | { success: true; orderId: string }

/**
 * Places an order from a quote. Never trusts a client-supplied price — the
 * unit price always comes from the persisted `quotes` row, re-read here.
 * Runs on the service role since checkout is guest-friendly (orders has no
 * public/authenticated INSERT policy by design; see 0004_display_boxes.sql).
 */
export async function placeOrder(
  input: CheckoutInput,
  customerId: string | null
): Promise<PlaceOrderResult> {
  const quote = await getQuoteById(input.quoteId)
  if (!quote) {
    return { error: 'This quote could not be found. Please get a new price.' }
  }
  if (quote.status !== 'active' || isQuoteExpired(quote)) {
    return { error: 'This quote has expired. Please get a new price.' }
  }

  const supabase = createAdminClient()
  const totalPriceCents = quote.price_cents * input.quantity

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      quote_id: quote.id,
      customer_id: customerId,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone || null,
      status: 'pending',
      total_price_cents: totalPriceCents,
      currency: 'usd',
      shipping_address: input.shippingAddress,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    return { error: 'Could not place your order. Please try again.' }
  }

  const dict = getDictionary(input.locale)
  const baseLabel = dict.baseTypes[quote.base_type as BaseType].label
  const description = `${quote.length_mm / 10}×${quote.width_mm / 10}×${quote.height_mm / 10}${dict.common.cm}, ${quote.thickness_mm}${dict.common.mm} acrylic, ${baseLabel}`

  const { error: itemError } = await supabase.from('order_items').insert({
    order_id: order.id,
    quote_id: quote.id,
    description,
    quantity: input.quantity,
    unit_price_cents: quote.price_cents,
  })

  if (itemError) {
    return { error: 'Could not place your order. Please try again.' }
  }

  await supabase.from('quotes').update({ status: 'converted' }).eq('id', quote.id)

  return { success: true, orderId: order.id }
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
  if (error) return null
  return data
}

export async function getOrderItemsByOrderId(orderId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  return data ?? []
}
