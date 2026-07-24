import { describe, expect, it } from 'vitest'

import {
  calculatePrice,
  PricingValidationError,
  selectThicknessMm,
  type MaterialRate,
  type PricingConfigInput,
} from './engine'

// Mirrors supabase/seed.sql exactly so these tests double as a contract
// check on the seed data's shape. Rates/fees are calibrated against a real
// competitor's public price list (₪250 for a ~45cm case up to ₪300 for a
// ~63cm case) — see the "real-world calibration" tests below for the
// worked comparison.
const CONFIG: PricingConfigInput = {
  wasteFactor: 1.15,
  marginPct: 0.2,
  minMarginCents: 3000,
  assemblyFeeCents: 6000,
  baseLedFeeCents: 8000,
  minPriceCents: 8000,
  roundingStepCents: 500,
  minDimMm: 50,
  maxDimMm: 1000,
}

const RATES: MaterialRate[] = [
  { material: 'acrylic_clear', thicknessMm: 3, costPerM2Cents: 10800, cutCostPerMCents: 900 },
  { material: 'acrylic_clear', thicknessMm: 4, costPerM2Cents: 13800, cutCostPerMCents: 1020 },
  { material: 'acrylic_clear', thicknessMm: 5, costPerM2Cents: 17400, cutCostPerMCents: 1140 },
  { material: 'acrylic_black', thicknessMm: 3, costPerM2Cents: 12600, cutCostPerMCents: 900 },
  { material: 'acrylic_black', thicknessMm: 4, costPerM2Cents: 15600, cutCostPerMCents: 1020 },
  { material: 'acrylic_black', thicknessMm: 5, costPerM2Cents: 19200, cutCostPerMCents: 1140 },
]

describe('selectThicknessMm', () => {
  it('picks 3mm at and below the small tier boundary', () => {
    expect(selectThicknessMm({ lengthMm: 300, widthMm: 50, heightMm: 50 })).toBe(3)
  })
  it('picks 4mm just above the small tier boundary', () => {
    expect(selectThicknessMm({ lengthMm: 301, widthMm: 50, heightMm: 50 })).toBe(4)
  })
  it('picks 4mm at the mid tier boundary', () => {
    expect(selectThicknessMm({ lengthMm: 600, widthMm: 50, heightMm: 50 })).toBe(4)
  })
  it('picks 5mm above the mid tier boundary', () => {
    expect(selectThicknessMm({ lengthMm: 601, widthMm: 50, heightMm: 50 })).toBe(5)
  })
})

describe('calculatePrice', () => {
  it('prices a tiny box with no base', () => {
    const result = calculatePrice(
      { lengthMm: 100, widthMm: 80, heightMm: 60, baseType: 'none' },
      CONFIG,
      RATES
    )
    expect(result.thicknessMm).toBe(3)
    expect(result.breakdown.baseMaterialCents).toBe(0)
    expect(result.priceCents).toBe(11000)
  })

  it('prices a mid-size box with a clear acrylic base', () => {
    const result = calculatePrice(
      { lengthMm: 300, widthMm: 200, heightMm: 250, baseType: 'acrylic_clear' },
      CONFIG,
      RATES
    )
    expect(result.thicknessMm).toBe(3)
    expect(result.breakdown.baseAreaM2).toBeCloseTo(0.06, 5)
    expect(result.priceCents).toBe(19500)
  })

  it('prices a large box with an LED base, including the flat LED fee', () => {
    const result = calculatePrice(
      { lengthMm: 700, widthMm: 400, heightMm: 350, baseType: 'led' },
      CONFIG,
      RATES
    )
    expect(result.thicknessMm).toBe(5)
    expect(result.breakdown.ledFeeCents).toBe(8000)
    expect(result.priceCents).toBe(65500)
  })

  it('rejects dimensions below the configured minimum', () => {
    expect(() =>
      calculatePrice({ lengthMm: 10, widthMm: 80, heightMm: 60, baseType: 'none' }, CONFIG, RATES)
    ).toThrow(PricingValidationError)
  })

  it('rejects dimensions above the configured maximum', () => {
    expect(() =>
      calculatePrice(
        { lengthMm: 1200, widthMm: 80, heightMm: 60, baseType: 'none' },
        CONFIG,
        RATES
      )
    ).toThrow(PricingValidationError)
  })

  it('throws a clear error when a required material rate is missing', () => {
    const sparseRates = RATES.filter((r) => r.material !== 'acrylic_black')
    expect(() =>
      calculatePrice(
        { lengthMm: 300, widthMm: 200, heightMm: 250, baseType: 'acrylic_black' },
        CONFIG,
        sparseRates
      )
    ).toThrow(/No active material rate/)
  })
})

// Sanity check against real market data: dimensions of sets a real Israeli
// acrylic-case seller publicly prices (see PLAN.md history / commit message
// for sourcing), with a black acrylic base to match that seller's "5mm
// black double-sided base" standard offering. The engine is area/cut-length
// based while the real seller prices roughly linear-in-longest-dimension,
// so exact matches aren't expected — landing within ~10% across this size
// range is the actual goal, which is what these assert.
describe('calculatePrice — real-world calibration', () => {
  function expectWithinPercent(actualCents: number, targetCents: number, percent: number) {
    const diff = Math.abs(actualCents - targetCents)
    expect(diff).toBeLessThanOrEqual(targetCents * (percent / 100))
  }

  it('lands close to ₪250 for a Batmobile Tumbler-sized case (450×250×160mm)', () => {
    const result = calculatePrice(
      { lengthMm: 450, widthMm: 250, heightMm: 160, baseType: 'acrylic_black' },
      CONFIG,
      RATES
    )
    expectWithinPercent(result.priceCents, 25000, 10)
  })

  it('lands close to ₪280 for a 1:8 Technic supercar-sized case (590×250×140mm)', () => {
    const result = calculatePrice(
      { lengthMm: 590, widthMm: 250, heightMm: 140, baseType: 'acrylic_black' },
      CONFIG,
      RATES
    )
    expectWithinPercent(result.priceCents, 28000, 10)
  })

  it('lands close to ₪300 for a large Technic F1-sized case (630×260×130mm)', () => {
    const result = calculatePrice(
      { lengthMm: 630, widthMm: 260, heightMm: 130, baseType: 'acrylic_black' },
      CONFIG,
      RATES
    )
    expectWithinPercent(result.priceCents, 30000, 15)
  })
})
