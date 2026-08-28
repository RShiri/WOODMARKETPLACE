import { describe, expect, it } from 'vitest'

import {
  calculatePrice,
  evaluateSpan,
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
  maxDimMm: 1500,
  oversizeThresholdMm: 1000,
}

const RATES: MaterialRate[] = [
  { material: 'acrylic_clear', thicknessMm: 3, costPerM2Cents: 10800, cutCostPerMCents: 900 },
  { material: 'acrylic_clear', thicknessMm: 4, costPerM2Cents: 13800, cutCostPerMCents: 1020 },
  { material: 'acrylic_clear', thicknessMm: 5, costPerM2Cents: 17400, cutCostPerMCents: 1140 },
  { material: 'acrylic_black', thicknessMm: 3, costPerM2Cents: 12600, cutCostPerMCents: 900 },
  { material: 'acrylic_black', thicknessMm: 4, costPerM2Cents: 15600, cutCostPerMCents: 1020 },
  { material: 'acrylic_black', thicknessMm: 5, costPerM2Cents: 19200, cutCostPerMCents: 1140 },
  { material: 'acrylic_clear', thicknessMm: 6, costPerM2Cents: 24800, cutCostPerMCents: 1700 },
  { material: 'acrylic_black', thicknessMm: 6, costPerM2Cents: 26900, cutCostPerMCents: 1700 },
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
  it('picks 5mm at the oversize boundary', () => {
    expect(selectThicknessMm({ lengthMm: 1000, widthMm: 50, heightMm: 50 })).toBe(5)
  })
  it('picks 6mm just above the oversize boundary', () => {
    expect(selectThicknessMm({ lengthMm: 1001, widthMm: 50, heightMm: 50 })).toBe(6)
  })
  it('picks 6mm from any axis, not just length', () => {
    expect(selectThicknessMm({ lengthMm: 400, widthMm: 200, heightMm: 1200 })).toBe(6)
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
        { lengthMm: 1600, widthMm: 80, heightMm: 60, baseType: 'none' },
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


// The hybrid >100cm boundary: the 1001-1500mm band prices automatically at
// 6mm with freight shipping and a structural warning; past 1500mm the engine
// refuses with a code the calculator turns into a custom-quote CTA.
describe('oversized boxes', () => {
  const OVERSIZED = { lengthMm: 1200, widthMm: 400, heightMm: 950, baseType: 'acrylic_clear' } as const

  it('prices the 120x40x95cm case that used to be rejected outright', () => {
    const result = calculatePrice(OVERSIZED, CONFIG, RATES)
    expect(result.thicknessMm).toBe(6)
    expect(result.oversize).toBe(true)
    expect(result.shippingMethod).toBe('oversized_freight')
    expect(result.priceCents).toBeGreaterThan(0)
    expect(result.breakdown.longestDimensionMm).toBe(1200)
  })

  it('leaves a box at the threshold on standard shipping and 5mm', () => {
    const result = calculatePrice(
      { lengthMm: 1000, widthMm: 400, heightMm: 300, baseType: 'acrylic_clear' },
      CONFIG,
      RATES
    )
    expect(result.thicknessMm).toBe(5)
    expect(result.oversize).toBe(false)
    expect(result.shippingMethod).toBe('standard')
  })

  it('flags freight from the first millimetre past the threshold', () => {
    const result = calculatePrice(
      { lengthMm: 1001, widthMm: 400, heightMm: 300, baseType: 'acrylic_clear' },
      CONFIG,
      RATES
    )
    expect(result.oversize).toBe(true)
    expect(result.shippingMethod).toBe('oversized_freight')
  })

  it('refuses past the ceiling with the custom-quote code', () => {
    try {
      calculatePrice({ lengthMm: 1501, widthMm: 400, heightMm: 300, baseType: 'none' }, CONFIG, RATES)
      throw new Error('expected a PricingValidationError')
    } catch (error) {
      expect(error).toBeInstanceOf(PricingValidationError)
      expect((error as PricingValidationError).code).toBe('DIMENSION_REQUIRES_CUSTOM_QUOTE')
    }
  })

  it('distinguishes an undersized box from an oversized one by code', () => {
    try {
      calculatePrice({ lengthMm: 10, widthMm: 400, heightMm: 300, baseType: 'none' }, CONFIG, RATES)
      throw new Error('expected a PricingValidationError')
    } catch (error) {
      expect((error as PricingValidationError).code).toBe('DIMENSION_BELOW_MIN')
    }
  })

  it('assesses spans without pricing them', () => {
    expect(evaluateSpan({ lengthMm: 1200, widthMm: 400, heightMm: 950 }, CONFIG)).toEqual({
      longestMm: 1200,
      isOversize: true,
      requiresCustomQuote: false,
      shippingMethod: 'oversized_freight',
    })
    expect(evaluateSpan({ lengthMm: 1600, widthMm: 400, heightMm: 950 }, CONFIG).requiresCustomQuote).toBe(
      true
    )
  })
})

// Pins the 6mm rates in supabase/seed.sql to the premium strategy documented
// in supabase/migrations/0010_oversized_boxes.sql, so a future rate edit that
// quietly flattens 6mm back to a linear step fails here rather than in
// production margins.
describe('6mm premium rate strategy', () => {
  const MATERIAL_PREMIUM = 1.15
  const CUT_PREMIUM = 1.35

  function roundTo100(cents: number): number {
    return Math.round(cents / 100) * 100
  }

  it.each([
    { material: 'acrylic_clear' as const, rate4: 13800, rate5: 17400, seeded: 24800 },
    { material: 'acrylic_black' as const, rate4: 15600, rate5: 19200, seeded: 26900 },
  ])('derives the seeded $material 6mm rate from the 4/5mm ladder', ({ rate4, rate5, seeded }) => {
    // The ladder's material delta grows by 600 each step (3000, 3600), so the
    // linear next step is the 5mm delta plus 600.
    const linearNext = rate5 + (rate5 - rate4) + 600
    expect(roundTo100(linearNext * MATERIAL_PREMIUM)).toBe(seeded)
  })

  it('derives the seeded 6mm cut cost from the flat +120/m step', () => {
    expect(roundTo100((1140 + 120) * CUT_PREMIUM)).toBe(1700)
  })

  it('is a genuinely non-linear step, not a proportional one', () => {
    const proportional = 17400 * (6 / 5)
    expect(24800).toBeGreaterThan(proportional * 1.15)
  })
})
