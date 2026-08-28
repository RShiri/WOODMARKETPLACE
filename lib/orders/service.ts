import { createAdminClient } from '@/lib/supabase/admin'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { getQuoteById, isQuoteExpired } from '@/lib/pricing/quote-service'
import type { BaseType, ShippingMethod } from '@/lib/pricing/engine'
import type { CheckoutInput } from '@/lib/validations/checkout'
import type { Order, OrderItem, Quote } from '@/types/database.types'

export type PlaceOrderResult = { error: string } | { success: true; orderId: string }

/**
 * An order ships freight if ANY of its lines does — a single 1.2m panel sets
 * the handling for the whole shipment, so this is a max across lines rather
 * than a per-line property. Read off the persisted quotes, never re-derived
 * from dimensions, so an order keeps the policy that applied when it was
 * priced even if the threshold moves later.
 */
export function shippingMethodForQuotes(quotes: Pick<Quote, 'shipping_method'>[]): ShippingMethod {
  return quotes.some((q) => q.shipping_method === 'oversized_freight')
    ? 'oversized_freight'
    : 'standard'
}

/**
 * Places an order from one or more quotes (the cart). Never trusts a
 * client-supplied price — every line's unit price comes from its persisted
 * `quotes` row, re-read here. Runs on the service role since checkout is
 * guest-friendly (orders has no public/authenticated INSERT policy by
 * design; see 0004_display_boxes.sql).
 */
export async function placeOrder(
  input: CheckoutInput,
  customerId: string | null
): Promise<PlaceOrderResult> {
  const quotes: Quote[] = []
  for (const line of input.items) {
    const quote = await getQuoteById(line.quoteId)
    if (!quote) {
      return { error: 'One of the items in your cart could not be found. Please get a new price.' }
    }
    if (quote.status !== 'active' || isQuoteExpired(quote)) {
      return { error: 'One of the items in your cart has expired. Please get a new price.' }
    }
    quotes.push(quote)
  }

  // All quotes come from the same shop-wide pricing_config at the time they
  // were created, so a currency mismatch would only happen if the shop
  // changed its base currency between two quotes still sitting in someone's
  // cart — vanishingly unlikely, but a wrong total is worse than an error.
  const currency = quotes[0].currency
  if (quotes.some((q) => q.currency !== currency)) {
    return { error: 'The items in your cart use different currencies. Please clear your cart and start again.' }
  }

  const totalPriceCents = quotes.reduce(
    (sum, quote, i) => sum + quote.price_cents * input.items[i].quantity,
    0
  )

  const supabase = createAdminClient()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      quote_id: quotes[0].id,
      customer_id: customerId,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone || null,
      status: 'pending',
      total_price_cents: totalPriceCents,
      currency,
      shipping_method: shippingMethodForQuotes(quotes),
      shipping_address: input.shippingAddress,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    return { error: 'Could not place your order. Please try again.' }
  }

  const dict = getDictionary(input.locale)
  const orderItems = quotes.map((quote, i) => {
    const baseLabel = dict.baseTypes[quote.base_type as BaseType].label
    const description = `${quote.length_mm / 10}×${quote.width_mm / 10}×${quote.height_mm / 10}${dict.common.cm}, ${quote.thickness_mm}${dict.common.mm} acrylic, ${baseLabel}`
    return {
      order_id: order.id,
      quote_id: quote.id,
      description,
      quantity: input.items[i].quantity,
      unit_price_cents: quote.price_cents,
    }
  })

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) {
    return { error: 'Could not place your order. Please try again.' }
  }

  await supabase
    .from('quotes')
    .update({ status: 'converted' })
    .in('id', quotes.map((q) => q.id))

  return { success: true, orderId: order.id }
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
  if (error) return null
  return data
}

/** Admin-only listing — callers must gate this behind requireAdminProfile() themselves. */
export async function getAllOrders(): Promise<Order[]> {
  const supabase = createAdminClient()
  const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
  return data ?? []
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

/** Batched fetch for a list of orders, grouped by order_id — avoids N+1 queries on the admin orders list. */
export async function getOrderItemsForOrders(orderIds: string[]): Promise<Map<string, OrderItem[]>> {
  const grouped = new Map<string, OrderItem[]>()
  if (orderIds.length === 0) return grouped

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', orderIds)
    .order('created_at', { ascending: true })

  for (const item of data ?? []) {
    const existing = grouped.get(item.order_id)
    if (existing) {
      existing.push(item)
    } else {
      grouped.set(item.order_id, [item])
    }
  }
  return grouped
}
