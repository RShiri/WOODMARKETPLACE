import { z } from 'zod'

/**
 * Shared create/edit schema for the artist product form. `status` is
 * intentionally limited to 'draft' | 'published' — artists can't set
 * 'archived' directly from this form; archiving/unarchiving a published
 * product goes through the dedicated archiveProduct/unarchiveProduct actions
 * instead (see app/(dashboard)/artist/products/actions.ts).
 */
export const productSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters'),
  description: z
    .string()
    .trim()
    .max(5000, 'Description must be 5000 characters or fewer')
    .optional()
    .or(z.literal('')),
  priceDollars: z.coerce.number().positive('Price must be greater than $0'),
  categoryId: z.string().optional().nullable(),
  woodTypeId: z.string().optional().nullable(),
  isMadeToOrder: z.boolean(),
  stockQuantity: z.coerce
    .number()
    .int('Stock quantity must be a whole number')
    .nonnegative('Stock quantity cannot be negative')
    .optional()
    .nullable(),
  status: z.enum(['draft', 'published']),
})

export type ProductFormInput = z.infer<typeof productSchema>
