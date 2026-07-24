'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { useCart } from '@/components/shared/cart-context'
import { CheckoutForm } from '@/components/shop/checkout-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { tf } from '@/lib/i18n/format'
import { useLocale } from '@/lib/i18n/locale-context'
import type { BaseType } from '@/lib/pricing/engine'
import { formatPrice } from '@/lib/utils/format'

interface QuoteDetails {
  quoteId: string
  lengthMm: number
  widthMm: number
  heightMm: number
  baseType: string
  thicknessMm: number
  priceCents: number
  currency: string
  expired: boolean
}

interface CheckoutLine {
  quoteId: string
  quantity: number
  quote: QuoteDetails
}

function parseQuantity(value: string | null): number {
  const parsed = Number.parseInt(value ?? '1', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.min(parsed, 10)
}

/**
 * Dual-mode: a `?quote=` URL param (the WhatsApp bot's deep link, or a
 * shared calculator link) checks out that single quote directly without
 * touching the cart. With no param, it checks out the cart's contents.
 * Either way, the price is always re-fetched from GET /api/quote/:id —
 * never trusted from the URL — and placeOrder() re-validates server-side
 * again before charging anything.
 */
export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const { items: cartItems } = useCart()
  const { dict } = useLocale()

  const directQuoteId = searchParams.get('quote')
  const directQty = parseQuantity(searchParams.get('qty'))
  const isDirectMode = Boolean(directQuoteId)

  const [lines, setLines] = useState<CheckoutLine[] | null>(null)
  const [hadInvalidItems, setHadInvalidItems] = useState(false)

  const sourceKey = isDirectMode
    ? `${directQuoteId}:${directQty}`
    : cartItems.map((i) => `${i.quoteId}:${i.quantity}`).join(',')

  useEffect(() => {
    let cancelled = false
    const sourceItems = isDirectMode
      ? directQuoteId
        ? [{ quoteId: directQuoteId, quantity: directQty }]
        : []
      : cartItems

    if (sourceItems.length === 0) {
      setLines([])
      return
    }

    Promise.all(
      sourceItems.map(async (item) => {
        try {
          const res = await fetch(`/api/quote/${item.quoteId}`)
          const data = await res.json()
          if (!res.ok || data.expired) return null
          return { quoteId: item.quoteId, quantity: item.quantity, quote: data as QuoteDetails }
        } catch {
          return null
        }
      })
    ).then((results) => {
      if (cancelled) return
      const valid = results.filter((r): r is CheckoutLine => r !== null)
      setHadInvalidItems(valid.length < results.length)
      setLines(valid)
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey, isDirectMode])

  if (lines === null) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Skeleton className="h-64 w-full" />
      </main>
    )
  }

  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          {hadInvalidItems ? dict.checkout.expiredTitle : dict.checkout.noQuoteTitle}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {hadInvalidItems ? dict.checkout.expiredSubtitle : dict.checkout.noQuoteSubtitle}
        </p>
        <Button asChild className="mt-6">
          <Link href={isDirectMode ? '/calculator' : '/cart'}>
            {isDirectMode ? dict.checkout.getNewPrice : dict.checkout.goToCalculator}
          </Link>
        </Button>
      </main>
    )
  }

  const currency = lines[0].quote.currency
  const totalCents = lines.reduce((sum, line) => sum + line.quote.priceCents * line.quantity, 0)

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{dict.checkout.title}</h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <CheckoutForm
          items={lines.map((line) => ({ quoteId: line.quoteId, quantity: line.quantity }))}
          clearCartOnSuccess={!isDirectMode}
        />

        <Card className="h-fit">
          <CardContent className="flex flex-col gap-3 p-6">
            <p className="font-medium text-foreground">{dict.checkout.orderSummary}</p>
            {lines.map((line) => (
              <div key={line.quoteId} className="text-sm text-muted-foreground">
                {line.quote.lengthMm / 10} × {line.quote.widthMm / 10} × {line.quote.heightMm / 10}{' '}
                {dict.common.cm}
                <br />
                {tf(dict.checkout.dimsAndBase, {
                  thickness: line.quote.thicknessMm,
                  base: dict.baseTypes[line.quote.baseType as BaseType].label,
                })}
                <br />
                {tf(dict.checkout.qtyLabel, { qty: line.quantity })}
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-semibold text-foreground">
              <span>{dict.checkout.totalLabel}</span>
              <span>{formatPrice(totalCents, currency)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
