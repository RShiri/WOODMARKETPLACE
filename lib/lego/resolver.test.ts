import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchFromBrickLink } from './bricklink'
import { fetchFromBrickset } from './brickset'
import { fetchFromRebrickable } from './rebrickable'
import { resolveDimensions } from './resolver'

vi.mock('./brickset', () => ({ fetchFromBrickset: vi.fn() }))
vi.mock('./bricklink', () => ({ fetchFromBrickLink: vi.fn() }))
vi.mock('./rebrickable', () => ({ fetchFromRebrickable: vi.fn() }))

// The cache is deliberately unavailable in every test here: this file exists
// to pin the behaviour that a set lookup still succeeds when Supabase is
// unreachable. Before this, the cache read threw, the throw escaped
// resolveDimensions, and the route rendered "Could not look up that set."
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    throw new TypeError('fetch failed')
  },
}))

beforeEach(() => {
  vi.mocked(fetchFromBrickset).mockReset().mockResolvedValue(null)
  vi.mocked(fetchFromBrickLink).mockReset().mockResolvedValue(null)
  vi.mocked(fetchFromRebrickable).mockReset().mockResolvedValue(null)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('resolveDimensions with an unreachable cache', () => {
  it('still resolves a set from BrickLink, flagged as uncached', async () => {
    vi.mocked(fetchFromBrickLink).mockResolvedValue({
      name: 'Avengers Tower',
      lengthMm: 580,
      widthMm: 378,
      heightMm: 94,
      imageUrl: null,
      yearReleased: 2023,
    })

    const result = await resolveDimensions('76269')
    expect(result).toMatchObject({
      setId: '76269-1',
      name: 'Avengers Tower',
      lengthMm: 580,
      source: 'bricklink',
      // BrickLink reports packaging, not the built model — never 'exact'.
      confidence: 'estimated',
      cached: false,
    })
  })

  it('falls all the way through to the heuristic without throwing', async () => {
    const result = await resolveDimensions('12345')
    expect(result).not.toBeNull()
    expect(result!.confidence).toBe('estimated')
    expect(result!.cached).toBe(false)
    expect(result!.lengthMm).toBeGreaterThan(0)
  })

  it('still rejects input that is not a set number at all', async () => {
    expect(await resolveDimensions('not-a-set')).toBeNull()
  })
})

describe('resolver tier order', () => {
  it('prefers Brickset built-model dimensions over BrickLink packaging', async () => {
    vi.mocked(fetchFromBrickset).mockResolvedValue({
      name: 'Titanic',
      lengthMm: 1350,
      widthMm: 160,
      heightMm: 440,
      imageUrl: null,
    })
    vi.mocked(fetchFromBrickLink).mockResolvedValue({
      name: 'Titanic',
      lengthMm: 700,
      widthMm: 400,
      heightMm: 200,
      imageUrl: null,
      yearReleased: 2021,
    })

    const result = await resolveDimensions('10294-1')
    expect(result).toMatchObject({ source: 'brickset', confidence: 'exact', lengthMm: 1350 })
    expect(fetchFromBrickLink).not.toHaveBeenCalled()
  })

  it('only reaches Rebrickable when both catalog tiers miss', async () => {
    vi.mocked(fetchFromRebrickable).mockResolvedValue({
      name: 'Some Set',
      pieceCount: 1200,
      theme: null,
      imageUrl: null,
    })

    const result = await resolveDimensions('11111')
    expect(fetchFromBrickLink).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ source: 'rebrickable', confidence: 'estimated' })
  })
})
