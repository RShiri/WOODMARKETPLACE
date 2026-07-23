import { NextResponse, type NextRequest } from 'next/server'

import { getQuoteById, isQuoteExpired } from '@/lib/pricing/quote-service'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const quote = await getQuoteById(params.id).catch(() => null)

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
  }

  const expired = quote.status === 'expired' || isQuoteExpired(quote)

  return NextResponse.json({
    quoteId: quote.id,
    lengthMm: quote.length_mm,
    widthMm: quote.width_mm,
    heightMm: quote.height_mm,
    baseType: quote.base_type,
    thicknessMm: quote.thickness_mm,
    legoSetId: quote.lego_set_id,
    priceCents: quote.price_cents,
    breakdown: quote.breakdown,
    status: quote.status,
    expired,
    expiresAt: quote.expires_at,
    createdAt: quote.created_at,
  })
}
