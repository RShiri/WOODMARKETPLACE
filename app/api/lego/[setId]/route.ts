import { NextResponse, type NextRequest } from 'next/server'

import { resolveDimensions } from '@/lib/lego/resolver'
import { getClearancePaddingMm } from '@/lib/pricing/config'

export async function GET(_request: NextRequest, { params }: { params: { setId: string } }) {
  try {
    const resolved = await resolveDimensions(params.setId)

    if (!resolved) {
      return NextResponse.json(
        { error: `"${params.setId}" doesn't look like a LEGO set number.` },
        { status: 400 }
      )
    }

    const paddingMm = await getClearancePaddingMm()

    return NextResponse.json({
      setId: resolved.setId,
      name: resolved.name,
      pieceCount: resolved.pieceCount,
      confidence: resolved.confidence,
      source: resolved.source,
      // False when the cache was unavailable and this was resolved live —
      // the lookup still succeeded, it just wasn't persisted.
      cached: resolved.cached,
      imageUrl: resolved.imageUrl,
      // Raw built-model dimensions, as resolved/cached.
      modelDimensionsMm: {
        length: resolved.lengthMm,
        width: resolved.widthMm,
        height: resolved.heightMm,
      },
      // Suggested calculator inputs: model dimensions + display clearance
      // padding on every axis, so the box isn't a knife-edge fit.
      suggestedDimensionsMm: {
        length: resolved.lengthMm + paddingMm,
        width: resolved.widthMm + paddingMm,
        height: resolved.heightMm + paddingMm,
      },
      clearancePaddingMm: paddingMm,
    })
  } catch (error) {
    console.error(`GET /api/lego/${params.setId} failed`, error)
    return NextResponse.json({ error: 'Could not look up that set. Please try again.' }, { status: 500 })
  }
}
