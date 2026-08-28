'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StructuralWarning } from '@/components/shop/structural-warning'
import { formatPrice } from '@/lib/utils/format'
import { tf } from '@/lib/i18n/format'
import { useLocale } from '@/lib/i18n/locale-context'
import { supportRequestHref } from '@/lib/utils/support'
import type { Dictionary } from '@/lib/i18n/types'
import type { BaseType, PriceBreakdown, ShippingMethod } from '@/lib/pricing/engine'

interface QuoteResult {
  quoteId: string
  priceCents: number
  currency: string
  thicknessMm: number
  shippingMethod: ShippingMethod
  oversize: boolean
  oversizeThresholdMm: number
  breakdown: PriceBreakdown
}

export interface QuoteError {
  message: string
  /** PricingValidationCode when the engine refused; null for transport/unknown failures. */
  code: string | null
  /** The breached limit in mm, when the engine reported one. */
  limitMm: number | null
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
  dimensionsMm,
  onOrder,
  ordering,
}: {
  quote: QuoteResult | null
  loading: boolean
  error: QuoteError | null
  baseType: BaseType
  /** Current inputs, used to prefill the custom-quote request. */
  dimensionsMm: { lengthMm: number | null; widthMm: number | null; heightMm: number | null }
  onOrder: () => void
  ordering: boolean
}) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const { dict } = useLocale()

  // Past pricing_config.max_dim_mm the engine refuses to quote at all. That is
  // a real box the workshop can still build, so this is a handoff to sales
  // rather than a dead end: the order button is replaced, not just disabled.
  const needsCustomQuote = error?.code === 'DIMENSION_REQUIRES_CUSTOM_QUOTE'
  const cm = (mm: number | null) => (mm != null ? Math.round(mm / 10) : '?')
  const customQuoteHref = needsCustomQuote
    ? supportRequestHref(
        tf(dict.calculator.customQuoteMessage, {
          l: cm(dimensionsMm.lengthMm),
          w: cm(dimensionsMm.widthMm),
          h: cm(dimensionsMm.heightMm),
        })
      )
    : null

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div>
          <p className="text-sm text-muted-foreground">{dict.calculator.priceLabel}</p>
          {loading && !quote ? (
            <Skeleton className="mt-1 h-10 w-32" />
          ) : needsCustomQuote ? (
            <p className="mt-1 text-lg font-semibold text-foreground">
              {dict.calculator.customQuoteTitle}
            </p>
          ) : error ? (
            <p className="mt-1 text-sm text-destructive">{error.message}</p>
          ) : quote ? (
            <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">
              {formatPrice(quote.priceCents, quote.currency)}
            </p>
          ) : (
            <p className="mt-1 text-2xl font-semibold text-muted-foreground">
              {dict.calculator.enterDimensionsPrompt}
            </p>
          )}
          {needsCustomQuote && (
            <p className="mt-2 text-xs text-muted-foreground">
              {tf(dict.calculator.customQuoteHint, {
                max: error?.limitMm != null ? Math.round(error.limitMm / 10) : '?',
              })}
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
          {quote?.shippingMethod === 'oversized_freight' && (
            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              {dict.calculator.oversizedShippingLabel}
            </p>
          )}
        </div>

        {quote?.oversize && (
          <StructuralWarning
            thicknessMm={quote.thicknessMm}
            thresholdMm={quote.oversizeThresholdMm}
          />
        )}

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

        {needsCustomQuote ? (
          customQuoteHref ? (
            <Button size="lg" asChild className="w-full">
              <a href={customQuoteHref} target="_blank" rel="noopener noreferrer">
                {dict.calculator.customQuoteButton}
              </a>
            </Button>
          ) : (
            // No support channel configured — say so rather than rendering a
            // button that does nothing. See NEXT_PUBLIC_SUPPORT_* in .env.example.
            <p className="text-sm font-medium text-foreground">
              {dict.calculator.customQuoteUnavailable}
            </p>
          )
        ) : (
          <Button size="lg" disabled={!quote || loading || ordering} onClick={onOrder} className="w-full">
            {ordering ? dict.calculator.preparingCheckout : dict.calculator.orderButton}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
