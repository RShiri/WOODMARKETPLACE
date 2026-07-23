import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { tf } from '@/lib/i18n/format'
import { getServerDictionary } from '@/lib/i18n/server'
import { getOrderById, getOrderItemsByOrderId } from '@/lib/orders/service'
import { formatPrice } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Order Confirmed',
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const orderId = typeof searchParams.order === 'string' ? searchParams.order : undefined
  const order = orderId ? await getOrderById(orderId) : null
  const dict = getServerDictionary()

  if (!order) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">{dict.confirmation.orderNotFoundTitle}</h1>
        <Button asChild className="mt-6">
          <Link href="/calculator">{dict.confirmation.backToCalculator}</Link>
        </Button>
      </main>
    )
  }

  const items = await getOrderItemsByOrderId(order.id)

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
      <h1 className="mt-4 text-2xl font-bold text-foreground">{dict.confirmation.title}</h1>
      <p className="mt-2 text-muted-foreground">
        {tf(dict.confirmation.thanksMessage, {
          name: order.customer_name.split(' ')[0],
          email: order.customer_email,
        })}{' '}
        {dict.confirmation.orderIdLabel} <span className="font-mono text-xs">{order.id}</span>
      </p>

      <Card className="mt-8 text-start">
        <CardContent className="flex flex-col gap-3 p-6">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {item.description} &times;{item.quantity}
              </span>
              <span className="font-medium text-foreground">
                {formatPrice(item.unit_price_cents * item.quantity)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-semibold text-foreground">
            <span>{dict.confirmation.total}</span>
            <span>{formatPrice(order.total_price_cents)}</span>
          </div>
        </CardContent>
      </Card>

      <Button asChild className="mt-8">
        <Link href="/calculator">{dict.confirmation.buildAnother}</Link>
      </Button>
    </main>
  )
}
