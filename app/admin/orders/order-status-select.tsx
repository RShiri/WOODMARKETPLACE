'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLocale } from '@/lib/i18n/locale-context'
import type { OrderStatus } from '@/types/database.types'

import { updateOrderStatus } from './actions'

const STATUSES: OrderStatus[] = ['pending', 'paid', 'fulfilled', 'cancelled', 'refunded']

export function OrderStatusSelect({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const { dict } = useLocale()
  const [value, setValue] = useState(status)
  const [isPending, setIsPending] = useState(false)

  const labels: Record<OrderStatus, string> = {
    pending: dict.admin.statusPending,
    paid: dict.admin.statusPaid,
    fulfilled: dict.admin.statusFulfilled,
    cancelled: dict.admin.statusCancelled,
    refunded: dict.admin.statusRefunded,
  }

  async function handleChange(next: string) {
    const nextStatus = next as OrderStatus
    const previous = value
    setValue(nextStatus)
    setIsPending(true)
    try {
      const result = await updateOrderStatus(orderId, nextStatus)
      if ('error' in result) {
        setValue(previous)
        toast.error(dict.admin.statusUpdateFailed)
      } else {
        toast.success(dict.admin.statusUpdated)
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {labels[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
