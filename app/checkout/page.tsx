import type { Metadata } from 'next'
import Link from 'next/link'

import { CheckoutForm } from '@/components/shop/checkout-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { baseTypeLabel } from '@/lib/pricing/base-types'
import { getQuoteById, isQuoteExpired } from '@/lib/pricing/quote-service'
import { formatPrice } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Checkout',
}

function parseQuantity(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '1', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.min(parsed, 10)
}

/**
 * Server Component: re-reads the quote by id (never trusts anything in the
 * URL beyond the id itself) and renders a 410-style expired state if it's
 * gone stale. This is the trust boundary described in PLAN.md §1.2.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const quoteId = typeof searchParams.quote === 'string' ? searchParams.quote : undefined
  const quantity = parseQuantity(typeof searchParams.qty === 'string' ? searchParams.qty : undefined)

  if (!quoteId) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">No quote selected</h1>
        <p className="mt-2 text-muted-foreground">Start from the calculator to get a price.</p>
        <Button asChild className="mt-6">
          <Link href="/calculator">Go to calculator</Link>
        </Button>
      </main>
    )
  }

  const quote = await getQuoteById(quoteId)

  if (!quote) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Quote not found</h1>
        <p className="mt-2 text-muted-foreground">This link is no longer valid.</p>
        <Button asChild className="mt-6">
          <Link href="/calculator">Get a new price</Link>
        </Button>
      </main>
    )
  }

  if (quote.status !== 'active' || isQuoteExpired(quote)) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">This price has expired</h1>
        <p className="mt-2 text-muted-foreground">
          Prices are held for 72 hours to account for material cost changes. Please get a fresh
          quote to continue.
        </p>
        <Button asChild className="mt-6">
          <Link
            href={`/calculator?l=${quote.length_mm}&w=${quote.width_mm}&h=${quote.height_mm}&base=${quote.base_type}`}
          >
            Get a new price
          </Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Checkout</h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <CheckoutForm quoteId={quote.id} quantity={quantity} />

        <Card className="h-fit">
          <CardContent className="flex flex-col gap-3 p-6">
            <p className="font-medium text-foreground">Order summary</p>
            <div className="text-sm text-muted-foreground">
              {quote.length_mm / 10} × {quote.width_mm / 10} × {quote.height_mm / 10} cm
              <br />
              {quote.thickness_mm}mm acrylic &middot; {baseTypeLabel(quote.base_type)}
              <br />
              Qty: {quantity}
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-semibold text-foreground">
              <span>Total</span>
              <span>{formatPrice(quote.price_cents * quantity)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
