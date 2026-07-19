'use server'

import { requireCustomerProfile } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { shippingAddressSchema, type ShippingAddressInput } from '@/lib/validations/checkout'

type PlaceOrderInput = {
  items: { productId: string; quantity: number }[]
  shippingAddress: ShippingAddressInput
}

type PlaceOrderResult = { error: string } | { success: true; orderIds: string[] }

/**
 * Places one order per artist represented in the cart (an `orders` row can
 * only belong to a single artist). Never trusts client-supplied prices —
 * every line item's price, currency, and availability is re-fetched from
 * `products` here and used to compute totals, ignoring anything the client
 * sent beyond productId/quantity.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const { userId } = await requireCustomerProfile()

  const addressResult = shippingAddressSchema.safeParse(input.shippingAddress)
  if (!addressResult.success) {
    return { error: addressResult.error.issues[0]?.message ?? 'Invalid shipping address.' }
  }
  const shippingAddress = addressResult.data

  const items = input.items.filter(
    (item) => typeof item.productId === 'string' && item.productId.length > 0 && item.quantity > 0
  )

  if (items.length === 0) {
    return { error: 'Your cart is empty.' }
  }

  const supabase = await createClient()

  const productIds = Array.from(new Set(items.map((item) => item.productId)))
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, artist_id, price_cents, currency, status, title')
    .in('id', productIds)

  if (productsError) {
    return { error: 'Could not verify products. Please try again.' }
  }

  const productById = new Map((products ?? []).map((product) => [product.id, product]))

  type ValidatedLine = {
    productId: string
    artistId: string
    priceCents: number
    currency: string
    quantity: number
  }
  const validatedLines: ValidatedLine[] = []

  for (const item of items) {
    const product = productById.get(item.productId)
    if (!product) {
      return { error: `One of the items in your cart is no longer available.` }
    }
    if (product.status !== 'published') {
      return { error: `"${product.title}" is no longer available for purchase.` }
    }
    validatedLines.push({
      productId: product.id,
      artistId: product.artist_id,
      priceCents: product.price_cents,
      currency: product.currency,
      quantity: item.quantity,
    })
  }

  const linesByArtist = new Map<string, ValidatedLine[]>()
  for (const line of validatedLines) {
    const existing = linesByArtist.get(line.artistId)
    if (existing) {
      existing.push(line)
    } else {
      linesByArtist.set(line.artistId, [line])
    }
  }

  const orderIds: string[] = []

  for (const [artistId, lines] of linesByArtist) {
    const totalPriceCents = lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0)
    const currency = lines[0].currency

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: userId,
        artist_id: artistId,
        status: 'pending',
        currency,
        total_price_cents: totalPriceCents,
        shipping_address: shippingAddress,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      return { error: 'Could not place your order. Please try again.' }
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      lines.map((line) => ({
        order_id: order.id,
        product_id: line.productId,
        quantity: line.quantity,
        unit_price_cents: line.priceCents,
      }))
    )

    if (itemsError) {
      return { error: 'Could not place your order. Please try again.' }
    }

    orderIds.push(order.id)
  }

  return { success: true, orderIds }
}
