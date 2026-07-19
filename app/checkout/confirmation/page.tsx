import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Order Placed',
}

/**
 * Static confirmation page reached via client-side redirect after a
 * successful placeOrder call. Not a per-order receipt — just a simple
 * "thanks, we'll be in touch" landing page for this MVP.
 */
export default function CheckoutConfirmationPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Thank you — your order has been placed
      </h1>
      <p className="text-muted-foreground">
        The artist will confirm your order and follow up on payment and fulfillment details.
      </p>
      <Button asChild className="mt-4">
        <Link href="/shop">Continue shopping</Link>
      </Button>
    </main>
  )
}
