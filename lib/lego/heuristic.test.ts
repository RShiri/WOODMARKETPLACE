import { describe, expect, it } from 'vitest'

import { estimateDimensionsFromPieceCount } from './heuristic'

describe('estimateDimensionsFromPieceCount', () => {
  it('returns a generic placeholder when piece count is unknown', () => {
    const result = estimateDimensionsFromPieceCount(null)
    expect(result).toEqual({ lengthMm: 250, widthMm: 150, heightMm: 150 })
  })

  it('returns a larger estimate for a larger piece count', () => {
    const small = estimateDimensionsFromPieceCount(200)
    const large = estimateDimensionsFromPieceCount(5000)
    const volume = (d: { lengthMm: number; widthMm: number; heightMm: number }) =>
      d.lengthMm * d.widthMm * d.heightMm
    expect(volume(large)).toBeGreaterThan(volume(small))
  })

  it('keeps length as the longest axis and height as the shortest, by construction', () => {
    const result = estimateDimensionsFromPieceCount(2000)
    expect(result.lengthMm).toBeGreaterThanOrEqual(result.widthMm)
    expect(result.widthMm).toBeGreaterThanOrEqual(result.heightMm)
  })

  it('clamps very large piece counts to the maximum estimate bound', () => {
    const result = estimateDimensionsFromPieceCount(1_000_000)
    expect(result.lengthMm).toBeLessThanOrEqual(900)
    expect(result.widthMm).toBeLessThanOrEqual(900)
    expect(result.heightMm).toBeLessThanOrEqual(900)
  })
})
