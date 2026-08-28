import { NextResponse, type NextRequest } from 'next/server'

import { checkRateLimit } from '@/lib/rate-limit'
import { PricingValidationError } from '@/lib/pricing/engine'
import { createQuote } from '@/lib/pricing/quote-service'
import { createQuoteSchema } from '@/lib/validations/quote'

const QUOTE_RATE_LIMIT = 60
const QUOTE_RATE_WINDOW_SECONDS = 60

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimit(`quote:${clientIp(request)}`, QUOTE_RATE_LIMIT, QUOTE_RATE_WINDOW_SECONDS)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down and try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(QUOTE_RATE_WINDOW_SECONDS) } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = createQuoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 }
    )
  }

  try {
    const { quote, assessment, sizePolicy } = await createQuote({
      lengthMm: parsed.data.lengthMm,
      widthMm: parsed.data.widthMm,
      heightMm: parsed.data.heightMm,
      baseType: parsed.data.baseType,
      legoSetId: parsed.data.legoSetId,
      channel: parsed.data.channel,
      waPhone: parsed.data.waPhone,
    })

    return NextResponse.json({
      quoteId: quote.id,
      priceCents: quote.price_cents,
      currency: quote.currency,
      thicknessMm: quote.thickness_mm,
      shippingMethod: quote.shipping_method,
      oversize: assessment.isOversize,
      longestDimensionMm: assessment.longestMm,
      oversizeThresholdMm: sizePolicy.oversizeThresholdMm,
      maxDimMm: sizePolicy.maxDimMm,
      breakdown: quote.breakdown,
      expiresAt: quote.expires_at,
    })
  } catch (error) {
    if (error instanceof PricingValidationError) {
      // `code` is what lets the calculator tell "too big to quote unattended"
      // apart from an ordinary bad input and offer the custom-quote CTA.
      return NextResponse.json(
        { error: error.message, code: error.code, limitMm: error.limitMm },
        { status: 422 }
      )
    }
    console.error('POST /api/quote failed', error)
    // Surfaced to the client too, not just logs — this is pre-launch with no
    // real traffic yet, and Postgres/Supabase client errors here are
    // descriptive strings (bad key, missing table, RLS denial), not secrets.
    // Tighten this back to a generic message before going live for real.
    const detail = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Could not calculate a price. Please try again.', detail },
      { status: 500 }
    )
  }
}
