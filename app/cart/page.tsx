'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Minus, Plus, X } from 'lucide-react'

import { useCart } from '@/components/shared/cart-context'
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

interface CartLine {
  quoteId: string
  quantity: number
  quote: QuoteDetails | null
}

async function fetchLine(quoteId: string, quantity: number): Promise<CartLine> {
  try {
    const res = await fetch(`/api/quote/${quoteId}`)
    const data = await res.json()
    if (!res.ok || data.expired) return { quoteId, quantity, quote: null }
    return { quoteId, quantity, quote: data as QuoteDetails }
  } catch {
    return { quoteId, quantity, quote: null }
  }
}

export default function CartPage() {
  const { items, setQuantity, removeItem } = useCart()
  const router = useRouter()
  const { dict } = useLocale()
  const [lines, setLines] = useState<CartLine[] | null>(null)

  useEffect(() => {
    let cancelled = false
    if (items.length === 0) {
      setLines([])
      return
    }
    Promise.all(items.map((item) => fetchLine(item.quoteId, item.quantity))).then((results) => {
      if (!cancelled) setLines(results)
    })
    return () => {
      cancelled = true
    }
    // Re-fetch whenever the set of quote ids or their quantities changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => `${i.quoteId}:${i.quantity}`).join(',')])

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">{dict.cart.empty}</h1>
        <p className="mt-2 text-muted-foreground">{dict.cart.emptySubtitle}</p>
        <Button asChild className="mt-6">
          <Link href="/calculator">{dict.cart.goToCalculator}</Link>
        </Button>
      </main>
    )
  }

  if (lines === null) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{dict.cart.title}</h1>
        <Card className="mt-6">
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </main>
    )
  }

  const validLines = lines.filter((line): line is CartLine & { quote: QuoteDetails } => line.quote !== null)
  const currency = validLines[0]?.quote.currency
  const subtotalCents = validLines.reduce((sum, line) => sum + line.quote.priceCents * line.quantity, 0)

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{dict.cart.title}</h1>

      <div className="mt-6 flex flex-col gap-4">
        {lines.map((line) =>
          line.quote ? (
            <Card key={line.quoteId}>
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">
                      {tf(dict.cart.boxLabel, {
                        l: line.quote.lengthMm / 10,
                        w: line.quote.widthMm / 10,
                        h: line.quote.heightMm / 10,
                        unit: dict.common.cm,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tf(dict.cart.dimsAndBase, {
                        thickness: line.quote.thicknessMm,
                        base: dict.baseTypes[line.quote.baseType as BaseType].label,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {formatPrice(line.quote.priceCents, line.quote.currency)}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeItem(line.quoteId)}
                      aria-label={dict.cart.remove}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm font-medium text-foreground">{dict.cart.quantityLabel}</span>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(line.quoteId, Math.max(1, line.quantity - 1))}
                      disabled={line.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-6 text-center font-medium">{line.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(line.quoteId, Math.min(10, line.quantity + 1))}
                      disabled={line.quantity >= 10}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card key={line.quoteId}>
              <CardContent className="flex items-center justify-between gap-4 p-6">
                <p className="text-sm text-muted-foreground">{dict.cart.itemUnavailable}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => removeItem(line.quoteId)}>
                  {dict.cart.remove}
                </Button>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {validLines.length > 0 && (
        <Card className="mt-4">
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>{dict.cart.totalLabel}</span>
              <span>{formatPrice(subtotalCents, currency)}</span>
            </div>
            <Button size="lg" onClick={() => router.push('/checkout')}>
              {dict.cart.proceedButton}
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
