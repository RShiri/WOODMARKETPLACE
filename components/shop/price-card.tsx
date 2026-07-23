'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/utils/format'
import { baseTypeLabel } from '@/lib/pricing/base-types'
import type { PriceBreakdown } from '@/lib/pricing/engine'

interface QuoteResult {
  quoteId: string
  priceCents: number
  thicknessMm: number
  breakdown: PriceBreakdown
}

const BREAKDOWN_ROWS: { key: keyof PriceBreakdown; label: string }[] = [
  { key: 'hoodMaterialCents', label: 'Hood material' },
  { key: 'baseMaterialCents', label: 'Base material' },
  { key: 'ledFeeCents', label: 'LED component' },
  { key: 'cutCostCents', label: 'Cutting' },
  { key: 'assemblyFeeCents', label: 'Assembly' },
  { key: 'marginCents', label: 'Margin' },
]

export function PriceCard({
  quote,
  loading,
  error,
  baseType,
  onOrder,
  ordering,
}: {
  quote: QuoteResult | null
  loading: boolean
  error: string | null
  baseType: string
  onOrder: () => void
  ordering: boolean
}) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div>
          <p className="text-sm text-muted-foreground">Estimated price</p>
          {loading && !quote ? (
            <Skeleton className="mt-1 h-10 w-32" />
          ) : error ? (
            <p className="mt-1 text-sm text-destructive">{error}</p>
          ) : quote ? (
            <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">
              {formatPrice(quote.priceCents)}
            </p>
          ) : (
            <p className="mt-1 text-2xl font-semibold text-muted-foreground">
              Enter dimensions to see a price
            </p>
          )}
          {quote && (
            <p className="mt-1 text-xs text-muted-foreground">
              {quote.thicknessMm}mm acrylic &middot; {baseTypeLabel(baseType)}
              {loading && ' · updating…'}
            </p>
          )}
        </div>

        {quote && (
          <div>
            <button
              type="button"
              onClick={() => setShowBreakdown((v) => !v)}
              className="flex items-center gap-1 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              How is this calculated?
              {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showBreakdown && (
              <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
                {BREAKDOWN_ROWS.filter((row) => (quote.breakdown[row.key] as number) > 0).map(
                  (row) => (
                    <div key={row.key} className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="font-medium text-foreground">
                        {formatPrice(quote.breakdown[row.key] as number)}
                      </dd>
                    </div>
                  )
                )}
                <div className="flex items-center justify-between border-t border-border pt-1.5 font-semibold">
                  <dt>Total</dt>
                  <dd>{formatPrice(quote.priceCents)}</dd>
                </div>
              </dl>
            )}
          </div>
        )}

        <Button size="lg" disabled={!quote || loading || ordering} onClick={onOrder} className="w-full">
          {ordering ? 'Preparing checkout…' : 'Order this box'}
        </Button>
      </CardContent>
    </Card>
  )
}
