import { describe, expect, it } from 'vitest'

import { normalizeSetId } from './normalize'

describe('normalizeSetId', () => {
  it('defaults a bare set number to variant -1', () => {
    expect(normalizeSetId('10294')).toBe('10294-1')
  })
  it('strips a leading #', () => {
    expect(normalizeSetId('#10294')).toBe('10294-1')
  })
  it('preserves an explicit variant', () => {
    expect(normalizeSetId('75192-1')).toBe('75192-1')
  })
  it('trims surrounding whitespace', () => {
    expect(normalizeSetId('  10294  ')).toBe('10294-1')
  })
  it('rejects non-numeric input', () => {
    expect(normalizeSetId('not a set')).toBeNull()
  })
  it('rejects a too-short number', () => {
    expect(normalizeSetId('12')).toBeNull()
  })
  it('rejects an empty string', () => {
    expect(normalizeSetId('')).toBeNull()
  })
})
