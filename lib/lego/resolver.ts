import { createAdminClient } from '@/lib/supabase/admin'
import type { LegoSetCache } from '@/types/database.types'

import { fetchFromBrickLink } from './bricklink'
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
  /** False when the cache was unreachable, so this result was resolved live and not persisted. */
  cached: boolean
}

const CACHE_TTL_DAYS = 90

type CacheFields = Omit<LegoSetCache, 'set_id' | 'fetched_at'>

function isFresh(fetchedAt: string): boolean {
  const ageMs = Date.now() - new Date(fetchedAt).getTime()
  return ageMs < CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
}

function rowHasDimensions(row: LegoSetCache): boolean {
  return row.length_mm != null && row.width_mm != null && row.height_mm != null
}

function toResolvedSet(row: LegoSetCache, cached: boolean): ResolvedSet {
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
    cached,
  }
}

/**
 * Cache read that degrades to a miss. The cache is an optimisation, not the
 * source of truth — a set lookup must not fail just because Supabase is
 * unreachable, which is exactly what used to happen: this query threw, the
 * throw propagated out of resolveDimensions, and the route turned it into
 * "Could not look up that set."
 */
async function readCache(setId: string): Promise<LegoSetCache | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('lego_sets_cache')
      .select('*')
      .eq('set_id', setId)
      .maybeSingle()
    if (error) {
      console.warn(`lego_sets_cache read failed for ${setId}, resolving live: ${error.message}`)
      return null
    }
    return data
  } catch (error) {
    console.warn(
      `lego_sets_cache unreachable for ${setId}, resolving live: ` +
        (error instanceof Error ? error.message : String(error))
    )
    return null
  }
}

/**
 * Cache write that degrades to a no-op, for the same reason as readCache.
 * Returns the persisted row, or null if it could not be written — callers
 * fall back to serving the freshly resolved values unpersisted.
 */
async function writeCache(setId: string, fields: CacheFields): Promise<LegoSetCache | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('lego_sets_cache')
      .upsert({ set_id: setId, ...fields, fetched_at: new Date().toISOString() })
      .select('*')
      .single()
    if (error || !data) {
      console.warn(
        `lego_sets_cache write failed for ${setId}, serving uncached: ${error?.message ?? 'no row returned'}`
      )
      return null
    }
    return data
  } catch (error) {
    console.warn(
      `lego_sets_cache unreachable for ${setId}, serving uncached: ` +
        (error instanceof Error ? error.message : String(error))
    )
    return null
  }
}

/** Persists a resolution if it can, and returns it either way. */
async function resolveAndCache(setId: string, fields: CacheFields): Promise<ResolvedSet> {
  const row = await writeCache(setId, fields)
  if (row) return toResolvedSet(row, true)
  return toResolvedSet({ set_id: setId, fetched_at: new Date().toISOString(), ...fields }, false)
}

/**
 * Resolves a LEGO set's built-model dimensions through a tiered strategy:
 * cache -> Brickset (exact built-model) -> BrickLink (packaging dimensions,
 * estimated) -> Rebrickable metadata + heuristic (estimated) -> generic
 * heuristic fallback. Always returns a result for a well-formed set number
 * (never throws for "unknown set", and no longer throws when the cache is
 * down either) so the calculator can always auto-fill something, clearly
 * labeled by confidence. Every successful resolution is cached when possible.
 *
 * Returns null only when the input isn't a set number at all.
 *
 * @param rawSetId user input, e.g. "10294", "#10294-1"
 */
export async function resolveDimensions(rawSetId: string): Promise<ResolvedSet | null> {
  const setId = normalizeSetId(rawSetId)
  if (!setId) return null

  const cached = await readCache(setId)

  if (cached && rowHasDimensions(cached) && isFresh(cached.fetched_at)) {
    return toResolvedSet(cached, true)
  }

  // Tier 2: Brickset — exact built dimensions when available.
  const brickset = await fetchFromBrickset(setId)
  if (brickset) {
    return resolveAndCache(setId, {
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
  }

  // Tier 3: BrickLink — real catalog measurements, but of the *packaging*
  // rather than the built model (see lib/lego/bricklink.ts). Better than a
  // piece-count guess and worse than Brickset, so it sits between them and is
  // recorded as an estimate.
  const brickLink = await fetchFromBrickLink(setId)
  if (brickLink) {
    return resolveAndCache(setId, {
      name: brickLink.name,
      length_mm: brickLink.lengthMm,
      width_mm: brickLink.widthMm,
      height_mm: brickLink.heightMm,
      piece_count: cached?.piece_count ?? null,
      theme: cached?.theme ?? null,
      source: 'bricklink',
      confidence: 'estimated',
      image_url: brickLink.imageUrl ?? cached?.image_url ?? null,
    })
  }

  // Tier 4/5: Rebrickable metadata (piece count) feeding the heuristic
  // estimator, or the generic heuristic fallback if Rebrickable is also
  // unavailable — either way the result is an estimate.
  const rebrickable = await fetchFromRebrickable(setId)
  const pieceCount = rebrickable?.pieceCount ?? cached?.piece_count ?? null
  const estimate = estimateDimensionsFromPieceCount(pieceCount)

  // If we have neither a cache row nor any external metadata at all, we
  // still don't actually know this is a real set number — but we resolve
  // it anyway with a generic estimate rather than failing, matching the
  // "always auto-fill something, labeled honestly" design.
  return resolveAndCache(setId, {
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
}

export { normalizeSetId } from './normalize'
