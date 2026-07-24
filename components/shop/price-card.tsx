'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/utils/format'
import { tf } from '@/lib/i18n/format'
import { useLocale } from '@/lib/i18n/locale-context'
import type { Dictionary } from '@/lib/i18n/types'
import type { BaseType, PriceBreakdown } from '@/lib/pricing/engine'

interface QuoteResult {
  quoteId: string
  priceCents: number
  currency: string
  thicknessMm: number
  breakdown: PriceBreakdown
}

function breakdownRows(dict: Dictionary): { key: keyof PriceBreakdown; label: string }[] {
  return [
    { key: 'hoodMaterialCents', label: dict.breakdown.hoodMaterial },
    { key: 'baseMaterialCents', label: dict.breakdown.baseMaterial },
    { key: 'ledFeeCents', label: dict.breakdown.ledComponent },
    { key: 'cutCostCents', label: dict.breakdown.cutting },
    { key: 'assemblyFeeCents', label: dict.breakdown.assembly },
    { key: 'marginCents', label: dict.breakdown.margin },
  ]
}

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
  baseType: BaseType
  onOrder: () => void
  ordering: boolean
}) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const { dict } = useLocale()

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div>
          <p className="text-sm text-muted-foreground">{dict.calculator.priceLabel}</p>
          {loading && !quote ? (
            <Skeleton className="mt-1 h-10 w-32" />
          ) : error ? (
            <p className="mt-1 text-sm text-destructive">{error}</p>
          ) : quote ? (
            <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">
              {formatPrice(quote.priceCents, quote.currency)}
            </p>
          ) : (
            <p className="mt-1 text-2xl font-semibold text-muted-foreground">
              {dict.calculator.enterDimensionsPrompt}
            </p>
          )}
          {quote && (
            <p className="mt-1 text-xs text-muted-foreground">
              {tf(dict.calculator.thicknessAndBase, {
                thickness: quote.thicknessMm,
                base: dict.baseTypes[baseType].label,
              })}
              {loading && dict.calculator.updatingSuffix}
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
              {dict.calculator.howCalculated}
              {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showBreakdown && (
              <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
                {breakdownRows(dict)
                  .filter((row) => (quote.breakdown[row.key] as number) > 0)
                  .map((row) => (
                    <div key={row.key} className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="font-medium text-foreground">
                        {formatPrice(quote.breakdown[row.key] as number, quote.currency)}
                      </dd>
                    </div>
                  ))}
                <div className="flex items-center justify-between border-t border-border pt-1.5 font-semibold">
                  <dt>{dict.breakdown.total}</dt>
                  <dd>{formatPrice(quote.priceCents, quote.currency)}</dd>
                </div>
              </dl>
            )}
          </div>
        )}

        <Button size="lg" disabled={!quote || loading || ordering} onClick={onOrder} className="w-full">
          {ordering ? dict.calculator.preparingCheckout : dict.calculator.orderButton}
        </Button>
      </CardContent>
    </Card>
  )
}
