import { NextResponse, type NextRequest } from 'next/server'

import { PricingValidationError } from '@/lib/pricing/engine'
import { createQuote } from '@/lib/pricing/quote-service'
import { createQuoteSchema } from '@/lib/validations/quote'

export async function POST(request: NextRequest) {
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
    const quote = await createQuote({
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
      thicknessMm: quote.thickness_mm,
      breakdown: quote.breakdown,
      expiresAt: quote.expires_at,
    })
  } catch (error) {
    if (error instanceof PricingValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    console.error('POST /api/quote failed', error)
    return NextResponse.json({ error: 'Could not calculate a price. Please try again.' }, { status: 500 })
  }
}
