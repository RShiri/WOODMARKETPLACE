export interface HeuristicDimensions {
  lengthMm: number
  widthMm: number
  heightMm: number
}

// Very rough average bounding-box volume per piece, derived from a handful
// of known sets (Titanic, Millennium Falcon, Colosseum, Bonsai Tree,
// Pyramid — see supabase/seed.sql). LEGO models are mostly hollow and vary
// wildly in shape, so this is a starting point, not a measurement — always
// surfaced as `confidence: 'estimated'` and editable by the user.
const VOLUME_PER_PIECE_MM3 = 15_000

// Default proportions (length : width : height). Most sets are wider/longer
// than tall; this has no awareness of a specific set's actual shape.
const ASPECT = { length: 1.6, width: 1.0, height: 0.55 }

const MIN_ESTIMATE_MM = 80
const MAX_ESTIMATE_MM = 900

// Used when there's no piece count at all (fully keyless mode) — a generic
// medium-build placeholder rather than a fabricated number.
const GENERIC_FALLBACK: HeuristicDimensions = { lengthMm: 250, widthMm: 150, heightMm: 150 }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

/**
 * Estimates a built model's bounding box from its piece count alone. This
 * is intentionally crude — it exists so the calculator can still auto-fill
 * *something* when Brickset/Rebrickable are unavailable or a set isn't in
 * the cache, never as a substitute for a real measurement.
 */
export function estimateDimensionsFromPieceCount(pieceCount: number | null): HeuristicDimensions {
  if (!pieceCount || pieceCount <= 0) {
    return GENERIC_FALLBACK
  }

  const volumeMm3 = pieceCount * VOLUME_PER_PIECE_MM3
  const aspectProduct = ASPECT.length * ASPECT.width * ASPECT.height
  const cubeSide = Math.cbrt(volumeMm3 / aspectProduct)

  return {
    lengthMm: clamp(cubeSide * ASPECT.length, MIN_ESTIMATE_MM, MAX_ESTIMATE_MM),
    widthMm: clamp(cubeSide * ASPECT.width, MIN_ESTIMATE_MM, MAX_ESTIMATE_MM),
    heightMm: clamp(cubeSide * ASPECT.height, MIN_ESTIMATE_MM, MAX_ESTIMATE_MM),
  }
}
