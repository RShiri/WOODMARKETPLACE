import { createAdminClient } from '@/lib/supabase/admin'
import type { LegoSetCache } from '@/types/database.types'

import { fetchFromBrickset } from './brickset'
import { estimateDimensionsFromPieceCount } from './heuristic'
import { normalizeSetId } from './normalize'
import { fetchFromRebrickable } from './rebrickable'

export interface ResolvedSet {
  setId: string
  name: string | null
  lengthMm: number
  widthMm: number
  heightMm: number
  pieceCount: number | null
  confidence: 'exact' | 'estimated'
  source: LegoSetCache['source']
  imageUrl: string | null
}

const CACHE_TTL_DAYS = 90

function isFresh(fetchedAt: string): boolean {
  const ageMs = Date.now() - new Date(fetchedAt).getTime()
  return ageMs < CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
}

function rowHasDimensions(row: LegoSetCache): boolean {
  return row.length_mm != null && row.width_mm != null && row.height_mm != null
}

function toResolvedSet(row: LegoSetCache): ResolvedSet {
  return {
    setId: row.set_id,
    name: row.name,
    lengthMm: row.length_mm!,
    widthMm: row.width_mm!,
    heightMm: row.height_mm!,
    pieceCount: row.piece_count,
    confidence: row.confidence as ResolvedSet['confidence'],
    source: row.source,
    imageUrl: row.image_url,
  }
}

/**
 * Resolves a LEGO set's built-model dimensions through a tiered strategy:
 * cache -> Brickset (exact) -> Rebrickable metadata + heuristic (estimated)
 * -> generic heuristic fallback. Always returns a result (never throws for
 * "unknown set") so the calculator can always auto-fill something, clearly
 * labeled by confidence. Every successful resolution is cached.
 *
 * @param rawSetId user input, e.g. "10294", "#10294-1"
 */
export async function resolveDimensions(rawSetId: string): Promise<ResolvedSet | null> {
  const setId = normalizeSetId(rawSetId)
  if (!setId) return null

  const supabase = createAdminClient()

  const { data: cached } = await supabase
    .from('lego_sets_cache')
    .select('*')
    .eq('set_id', setId)
    .maybeSingle()

  if (cached && rowHasDimensions(cached) && isFresh(cached.fetched_at)) {
    return toResolvedSet(cached)
  }

  // Tier 2: Brickset — exact built dimensions when available.
  const brickset = await fetchFromBrickset(setId)
  if (brickset) {
    const row = await upsertCache(supabase, setId, {
      name: brickset.name,
      length_mm: brickset.lengthMm,
      width_mm: brickset.widthMm,
      height_mm: brickset.heightMm,
      piece_count: cached?.piece_count ?? null,
      theme: cached?.theme ?? null,
      source: 'brickset',
      confidence: 'exact',
      image_url: brickset.imageUrl,
    })
    return toResolvedSet(row)
  }

  // Tier 3/4: Rebrickable metadata (piece count) feeding the heuristic
  // estimator, or the generic heuristic fallback if Rebrickable is also
  // unavailable — either way the result is an estimate.
  const rebrickable = await fetchFromRebrickable(setId)
  const pieceCount = rebrickable?.pieceCount ?? cached?.piece_count ?? null
  const estimate = estimateDimensionsFromPieceCount(pieceCount)

  // If we have neither a cache row nor any external metadata at all, we
  // still don't actually know this is a real set number — but we resolve
  // it anyway with a generic estimate rather than failing, matching the
  // "always auto-fill something, labeled honestly" design.
  const row = await upsertCache(supabase, setId, {
    name: rebrickable?.name ?? cached?.name ?? null,
    length_mm: estimate.lengthMm,
    width_mm: estimate.widthMm,
    height_mm: estimate.heightMm,
    piece_count: pieceCount,
    theme: rebrickable?.theme ?? cached?.theme ?? null,
    source: rebrickable ? 'rebrickable' : 'estimated',
    confidence: 'estimated',
    image_url: rebrickable?.imageUrl ?? cached?.image_url ?? null,
  })

  return toResolvedSet(row)
}

async function upsertCache(
  supabase: ReturnType<typeof createAdminClient>,
  setId: string,
  fields: Omit<LegoSetCache, 'set_id' | 'fetched_at'>
): Promise<LegoSetCache> {
  const { data, error } = await supabase
    .from('lego_sets_cache')
    .upsert({ set_id: setId, ...fields, fetched_at: new Date().toISOString() })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Could not cache LEGO set ${setId}: ${error?.message ?? 'unknown error'}`)
  }
  return data
}

export { normalizeSetId } from './normalize'
