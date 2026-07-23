'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Minus, Plus } from 'lucide-react'

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
  expired: boolean
}

export default function CartPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { dict } = useLocale()
  const quoteId = searchParams.get('quote')

  const [quote, setQuote] = useState<QuoteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!quoteId) {
      setLoading(false)
      return
    }
    fetch(`/api/quote/${quoteId}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? dict.cart.quoteNotFound)
          return
        }
        setQuote(data)
      })
      .catch(() => setError(dict.cart.quoteNotFound))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId])

  if (!quoteId) {
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

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{dict.cart.title}</h1>

      {loading && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      )}

      {!loading && (error || !quote) && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-muted-foreground">{error ?? dict.cart.quoteNotFound}</p>
            <Button asChild>
              <Link href="/calculator">{dict.cart.getNewPrice}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && quote && quote.expired && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-muted-foreground">{dict.cart.expiredMessage}</p>
            <Button asChild>
              <Link
                href={`/calculator?l=${quote.lengthMm}&w=${quote.widthMm}&h=${quote.heightMm}&base=${quote.baseType}`}
              >
                {dict.cart.getNewPrice}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && quote && !quote.expired && (
        <Card className="mt-6">
          <CardContent className="flex flex-col gap-6 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">
                  {tf(dict.cart.boxLabel, {
                    l: quote.lengthMm / 10,
                    w: quote.widthMm / 10,
                    h: quote.heightMm / 10,
                    unit: dict.common.cm,
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tf(dict.cart.dimsAndBase, {
                    thickness: quote.thicknessMm,
                    base: dict.baseTypes[quote.baseType as BaseType].label,
                  })}
                </p>
              </div>
              <p className="font-semibold text-foreground">{formatPrice(quote.priceCents)}</p>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm font-medium text-foreground">{dict.cart.quantityLabel}</span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-6 text-center font-medium">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  disabled={quantity >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4 text-lg font-semibold">
              <span>{dict.cart.totalLabel}</span>
              <span>{formatPrice(quote.priceCents * quantity)}</span>
            </div>

            <Button
              size="lg"
              onClick={() => router.push(`/checkout?quote=${quote.quoteId}&qty=${quantity}`)}
            >
              {dict.cart.proceedButton}
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
