'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdminProfile } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OrderStatus } from '@/types/database.types'

const ORDER_STATUSES: OrderStatus[] = ['pending', 'paid', 'fulfilled', 'cancelled', 'refunded']

const updateStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]),
})

export type UpdateOrderStatusResult = { error: string } | { success: true }

/**
 * orders has no authenticated UPDATE policy (writes always go through
 * service-role code that re-validates the caller), so this re-checks admin
 * role itself rather than relying on RLS to block non-admins.
 */
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<UpdateOrderStatusResult> {
  await requireAdminProfile()

  const parsed = updateStatusSchema.safeParse({ orderId, status })
  if (!parsed.success) {
    return { error: 'Invalid input.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.orderId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/orders')
  return { success: true }
}
