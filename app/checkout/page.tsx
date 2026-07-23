import type { Metadata } from 'next'
import Link from 'next/link'

import { CheckoutForm } from '@/components/shop/checkout-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { tf } from '@/lib/i18n/format'
import { getServerDictionary } from '@/lib/i18n/server'
import type { BaseType } from '@/lib/pricing/engine'
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
  const dict = getServerDictionary()

  if (!quoteId) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">{dict.checkout.noQuoteTitle}</h1>
        <p className="mt-2 text-muted-foreground">{dict.checkout.noQuoteSubtitle}</p>
        <Button asChild className="mt-6">
          <Link href="/calculator">{dict.checkout.goToCalculator}</Link>
        </Button>
      </main>
    )
  }

  const quote = await getQuoteById(quoteId)

  if (!quote) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">{dict.checkout.quoteNotFoundTitle}</h1>
        <p className="mt-2 text-muted-foreground">{dict.checkout.quoteNotFoundSubtitle}</p>
        <Button asChild className="mt-6">
          <Link href="/calculator">{dict.checkout.getNewPrice}</Link>
        </Button>
      </main>
    )
  }

  if (quote.status !== 'active' || isQuoteExpired(quote)) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">{dict.checkout.expiredTitle}</h1>
        <p className="mt-2 text-muted-foreground">{dict.checkout.expiredSubtitle}</p>
        <Button asChild className="mt-6">
          <Link
            href={`/calculator?l=${quote.length_mm}&w=${quote.width_mm}&h=${quote.height_mm}&base=${quote.base_type}`}
          >
            {dict.checkout.getNewPrice}
          </Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{dict.checkout.title}</h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <CheckoutForm quoteId={quote.id} quantity={quantity} />

        <Card className="h-fit">
          <CardContent className="flex flex-col gap-3 p-6">
            <p className="font-medium text-foreground">{dict.checkout.orderSummary}</p>
            <div className="text-sm text-muted-foreground">
              {quote.length_mm / 10} × {quote.width_mm / 10} × {quote.height_mm / 10} {dict.common.cm}
              <br />
              {tf(dict.checkout.dimsAndBase, {
                thickness: quote.thickness_mm,
                base: dict.baseTypes[quote.base_type as BaseType].label,
              })}
              <br />
              {tf(dict.checkout.qtyLabel, { qty: quantity })}
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-semibold text-foreground">
              <span>{dict.checkout.totalLabel}</span>
              <span>{formatPrice(quote.price_cents * quantity)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
