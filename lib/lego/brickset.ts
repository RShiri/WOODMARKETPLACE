export interface BricksetResult {
  name: string
  lengthMm: number
  widthMm: number
  heightMm: number
  imageUrl: string | null
}

/**
 * Best-effort call to the Brickset API (https://brickset.com/api/v3.asmx/getSets)
 * for exact built-model dimensions. Brickset reports dimensions in cm for
 * sets that have them recorded — many don't, so a null-ish response here is
 * expected and normal, not an error. Returns null on any failure (missing
 * key, network error, no dimensions on file) so the resolver can fall
 * through to the next tier without special-casing this integration.
 */
export async function fetchFromBrickset(setId: string): Promise<BricksetResult | null> {
  const apiKey = process.env.BRICKSET_API_KEY
  if (!apiKey) return null

  try {
    const params = new URLSearchParams({
      apiKey,
      userHash: '',
      params: JSON.stringify({ setNumber: setId }),
    })

    const response = await fetch('https://brickset.com/api/v3.asmx/getSets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data = (await response.json()) as {
      status?: string
      sets?: Array<{
        name?: string
        image?: { imageURL?: string }
        dimensions?: { height?: number; width?: number; depth?: number }
      }>
    }

    if (data.status !== 'success') return null
    const set = data.sets?.[0]
    const dims = set?.dimensions
    if (!set || !dims || !dims.height || !dims.width || !dims.depth) return null

    // Brickset reports dimensions in cm.
    return {
      name: set.name ?? setId,
      heightMm: Math.round(dims.height * 10),
      widthMm: Math.round(dims.width * 10),
      lengthMm: Math.round(dims.depth * 10),
      imageUrl: set.image?.imageURL ?? null,
    }
  } catch {
    return null
  }
}
