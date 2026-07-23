import { z } from 'zod'

export const baseTypeSchema = z.enum(['none', 'acrylic_clear', 'acrylic_black', 'led'])

export const createQuoteSchema = z.object({
  lengthMm: z.coerce.number().int().positive(),
  widthMm: z.coerce.number().int().positive(),
  heightMm: z.coerce.number().int().positive(),
  baseType: baseTypeSchema,
  legoSetId: z.string().trim().min(1).max(20).optional(),
  channel: z.enum(['web', 'whatsapp']).optional().default('web'),
  waPhone: z.string().trim().min(1).max(32).optional(),
})

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>
