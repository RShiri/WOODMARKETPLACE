import { z } from 'zod'

/**
 * Shipping address collected at checkout. Kept intentionally simple for the
 * MVP — free-text city/state/postal code rather than country-aware
 * validation, since the storefront doesn't yet restrict which countries can
 * be shipped to.
 */
export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  addressLine1: z.string().trim().min(3, 'Address is required'),
  addressLine2: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State / province is required'),
  postalCode: z.string().trim().min(1, 'Postal code is required'),
  country: z.string().trim().min(1, 'Country is required'),
})

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>

export const checkoutLineItemSchema = z.object({
  quoteId: z.string().uuid('Invalid quote.'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(10, 'Max 10 per line item'),
})

export type CheckoutLineItemInput = z.infer<typeof checkoutLineItemSchema>

/**
 * Guest-friendly checkout: contact details are captured directly on the
 * order rather than assumed from a logged-in profile, since most orders
 * arrive from a WhatsApp deep-link with no account at all. `items` supports
 * the multi-box cart — a WhatsApp deep-link just sends a single-item array.
 */
export const checkoutSchema = z.object({
  items: z.array(checkoutLineItemSchema).min(1, 'Your cart is empty.').max(20, 'Too many items in one order.'),
  customerName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  customerEmail: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  customerPhone: z.string().trim().optional().or(z.literal('')),
  shippingAddress: shippingAddressSchema,
  // The buyer's active UI locale at checkout time — stamped onto the stored
  // order_items.description so the receipt reads in the language they
  // actually ordered in, independent of whichever language views it later.
  locale: z.enum(['en', 'he']),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
