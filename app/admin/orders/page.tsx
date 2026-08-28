import type { Metadata } from 'next'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { requireAdminProfile } from '@/lib/auth/session'
import { getServerDictionary } from '@/lib/i18n/server'
import { getAllOrders, getOrderItemsForOrders } from '@/lib/orders/service'
import { formatDateTime, formatPrice } from '@/lib/utils/format'

import { OrderStatusSelect } from './order-status-select'

export const metadata: Metadata = {
  title: 'Orders — Admin',
}

export default async function AdminOrdersPage() {
  await requireAdminProfile()
  const dict = getServerDictionary()

  const orders = await getAllOrders()
  const itemsByOrder = await getOrderItemsForOrders(orders.map((o) => o.id))

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{dict.admin.ordersTitle}</h1>

      {orders.length === 0 ? (
        <p className="mt-6 text-muted-foreground">{dict.admin.noOrders}</p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {orders.map((order) => {
            const items = itemsByOrder.get(order.id) ?? []
            const address = order.shipping_address as {
              fullName?: string
              addressLine1?: string
              addressLine2?: string
              city?: string
              state?: string
              postalCode?: string
              country?: string
            } | null

            return (
              <Card key={order.id}>
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p>
                      <p className="font-mono text-xs text-muted-foreground">{order.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Freight orders need different handling before they are
                          packed, so this sits next to the status control rather
                          than buried in the line items. */}
                      {order.shipping_method === 'oversized_freight' && (
                        <Badge className="border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-100">
                          {dict.admin.oversizedFreight}
                        </Badge>
                      )}
                      <Badge variant="secondary">{formatPrice(order.total_price_cents, order.currency)}</Badge>
                      <OrderStatusSelect orderId={order.id} status={order.status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="font-medium text-foreground">{dict.admin.customer}</p>
                      <p className="text-muted-foreground">{order.customer_name}</p>
                      <p className="text-muted-foreground" dir="ltr">
                        {order.customer_email}
                      </p>
                      {order.customer_phone && (
                        <p className="text-muted-foreground" dir="ltr">
                          {order.customer_phone}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{dict.admin.shippingAddress}</p>
                      {address && (
                        <p className="text-muted-foreground">
                          {address.fullName}
                          <br />
                          {address.addressLine1}
                          {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                          <br />
                          {address.city}, {address.state} {address.postalCode}
                          <br />
                          {address.country}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <p className="text-sm font-medium text-foreground">{dict.admin.items}</p>
                    <ul className="mt-1 flex flex-col gap-1">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.description} &times;{item.quantity}
                          </span>
                          <span className="font-medium text-foreground">
                            {formatPrice(item.unit_price_cents * item.quantity, order.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
