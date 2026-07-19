import type { Metadata } from 'next'

import { requireCustomerProfile } from '@/lib/auth/session'
import { CheckoutForm } from '@/components/storefront/checkout-form'

export const metadata: Metadata = {
  title: 'Checkout',
}

/**
 * Server Component: gates the page to authenticated customers. The cart
 * itself lives in localStorage (client-only), so the actual cart summary
 * and shipping form are rendered by the client CheckoutForm component.
 */
export default async function CheckoutPage() {
  await requireCustomerProfile()

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Checkout</h1>
      <div className="mt-8">
        <CheckoutForm />
      </div>
    </main>
  )
}
