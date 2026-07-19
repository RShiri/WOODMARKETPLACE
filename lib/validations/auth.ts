import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>

const baseRegisterFields = {
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().trim().min(1, 'Full name is required'),
}

export const registerSchema = z
  .object({
    role: z.enum(['customer', 'artist'], {
      required_error: 'Select an account type',
    }),
    shopName: z.string().trim().optional(),
    ...baseRegisterFields,
  })
  .superRefine((data, ctx) => {
    if (data.role === 'artist') {
      if (!data.shopName || data.shopName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Shop name must be at least 2 characters',
          path: ['shopName'],
        })
      }
    }
  })

export type RegisterInput = z.infer<typeof registerSchema>
