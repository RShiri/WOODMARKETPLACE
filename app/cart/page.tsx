'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { baseTypeLabel } from '@/lib/pricing/base-types'
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
          setError(data.error ?? 'Could not load your quote.')
          return
        }
        setQuote(data)
      })
      .catch(() => setError('Could not load your quote.'))
      .finally(() => setLoading(false))
  }, [quoteId])

  if (!quoteId) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">
          Build a box in the calculator to add it to your cart.
        </p>
        <Button asChild className="mt-6">
          <Link href="/calculator">Go to calculator</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Your cart</h1>

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
            <p className="text-muted-foreground">{error ?? 'Quote not found.'}</p>
            <Button asChild>
              <Link href="/calculator">Get a new price</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && quote && quote.expired && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-muted-foreground">
              This price quote has expired. Prices are held for 72 hours — please get a fresh one.
            </p>
            <Button asChild>
              <Link
                href={`/calculator?l=${quote.lengthMm}&w=${quote.widthMm}&h=${quote.heightMm}&base=${quote.baseType}`}
              >
                Get a new price
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
                  {quote.lengthMm / 10} × {quote.widthMm / 10} × {quote.heightMm / 10} cm display box
                </p>
                <p className="text-sm text-muted-foreground">
                  {quote.thicknessMm}mm acrylic &middot; {baseTypeLabel(quote.baseType)}
                </p>
              </div>
              <p className="font-semibold text-foreground">{formatPrice(quote.priceCents)}</p>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm font-medium text-foreground">Quantity</span>
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
              <span>Total</span>
              <span>{formatPrice(quote.priceCents * quantity)}</span>
            </div>

            <Button
              size="lg"
              onClick={() => router.push(`/checkout?quote=${quote.quoteId}&qty=${quantity}`)}
            >
              Proceed to checkout
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
