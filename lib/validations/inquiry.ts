import { z } from 'zod'

/**
 * Converts an empty-string form value to `undefined` before the base zod
 * type runs. Without this, `z.coerce.number()` would coerce a blank
 * "optional" budget input (`''`) to `0` instead of leaving it unset, which
 * would incorrectly persist a $0 budget bound instead of `null`.
 */
const optionalDollarAmount = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  z.coerce.number().nonnegative('Budget cannot be negative').optional()
)

/**
 * Shared create schema for custom order inquiries — used both by the
 * `createInquiry` server action (authoritative validation) and by the
 * `RequestCustomOrderDialog` client form (so field-level errors surface
 * before the request round-trips to the server).
 */
export const createInquirySchema = z
  .object({
    artistId: z.string().min(1, 'Missing artist.'),
    productId: z.string().optional().nullable(),
    description: z
      .string()
      .trim()
      .min(10, 'Please provide at least 10 characters describing your request.')
      .max(2000, 'Description must be 2000 characters or fewer.'),
    budgetMinDollars: optionalDollarAmount,
    budgetMaxDollars: optionalDollarAmount,
  })
  .refine(
    (data) =>
      data.budgetMinDollars === undefined ||
      data.budgetMaxDollars === undefined ||
      data.budgetMaxDollars >= data.budgetMinDollars,
    {
      message: 'Maximum budget must be greater than or equal to minimum budget.',
      path: ['budgetMaxDollars'],
    }
  )

export type CreateInquiryInput = z.infer<typeof createInquirySchema>
