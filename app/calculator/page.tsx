import type { Metadata } from 'next'

import { Calculator, type CalculatorInitialState } from '@/components/shop/calculator'
import { getServerDictionary } from '@/lib/i18n/server'
import type { BaseType } from '@/lib/pricing/engine'

export const metadata: Metadata = {
  title: 'Price Calculator',
  description:
    'Enter your box dimensions or a LEGO set number and see a transparent, itemized price instantly.',
}

const VALID_BASE_TYPES: BaseType[] = ['none', 'acrylic_clear', 'acrylic_black', 'led']

function parseIntParam(value: string | string[] | undefined): number | undefined {
  if (typeof value !== 'string') return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/**
 * URL parameter contract (see PLAN.md §1.3): l/w/h in mm, base, set, tab.
 * These only ever prefill the form — the price is always recomputed
 * server-side by POST /api/quote, never trusted from the URL.
 */
export default function CalculatorPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const initial: CalculatorInitialState = {
    lengthMm: parseIntParam(searchParams.l),
    widthMm: parseIntParam(searchParams.w),
    heightMm: parseIntParam(searchParams.h),
    baseType: VALID_BASE_TYPES.includes(searchParams.base as BaseType)
      ? (searchParams.base as BaseType)
      : undefined,
    setId: typeof searchParams.set === 'string' ? searchParams.set : undefined,
    tab: searchParams.tab === 'set' || searchParams.set ? 'set' : 'dimensions',
  }

  const dict = getServerDictionary()

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{dict.calculator.pageTitle}</h1>
        <p className="mt-2 text-muted-foreground">{dict.calculator.pageSubtitle}</p>
      </div>
      <Calculator initial={initial} />
    </main>
  )
}
