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
