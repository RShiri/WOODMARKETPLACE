import type { Metadata } from 'next'
import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { requireProfile } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { formatDateTime, formatPrice } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'My Orders',
}

export default async function AccountPage() {
  await requireProfile()

  const supabase = await createClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">My orders</h1>

      {!orders || orders.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          No orders yet.{' '}
          <Link href="/calculator" className="underline underline-offset-4">
            Build a box
          </Link>{' '}
          to get started.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p>
                  <p className="font-mono text-xs text-muted-foreground">{order.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{order.status}</Badge>
                  <span className="font-semibold text-foreground">
                    {formatPrice(order.total_price_cents, order.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
