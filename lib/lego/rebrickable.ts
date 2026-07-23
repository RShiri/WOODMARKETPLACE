export interface RebrickableResult {
  name: string
  pieceCount: number | null
  theme: string | null
  imageUrl: string | null
}

/**
 * Best-effort call to the Rebrickable API (https://rebrickable.com/api/v3/)
 * for set metadata. Rebrickable doesn't expose built-model dimensions, so
 * this only ever feeds the piece-count heuristic (lib/lego/heuristic.ts) —
 * it never returns a `confidence: 'exact'` result on its own. Returns null
 * on any failure so the resolver falls through to the heuristic tier.
 */
export async function fetchFromRebrickable(setId: string): Promise<RebrickableResult | null> {
  const apiKey = process.env.REBRICKABLE_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch(`https://rebrickable.com/api/v3/lego/sets/${setId}/`, {
      headers: { Authorization: `key ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data = (await response.json()) as {
      name?: string
      num_parts?: number
      set_img_url?: string
      theme_id?: number
    }

    return {
      name: data.name ?? setId,
      pieceCount: typeof data.num_parts === 'number' ? data.num_parts : null,
      theme: null,
      imageUrl: data.set_img_url ?? null,
    }
  } catch {
    return null
  }
}
