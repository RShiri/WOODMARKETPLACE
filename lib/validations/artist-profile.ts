import { z } from 'zod'

export const artistProfileSchema = z.object({
  shopName: z.string().trim().min(2, 'Shop name must be at least 2 characters'),
  bio: z
    .string()
    .trim()
    .max(1000, 'Bio must be 1000 characters or fewer')
    .optional()
    .or(z.literal('')),
  location: z.string().trim().max(200, 'Location is too long').optional().or(z.literal('')),
})

export type ArtistProfileInput = z.infer<typeof artistProfileSchema>
