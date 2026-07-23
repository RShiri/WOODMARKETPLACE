import { describe, expect, it } from 'vitest'

import {
  calculatePrice,
  PricingValidationError,
  selectThicknessMm,
  type MaterialRate,
  type PricingConfigInput,
} from './engine'

// Mirrors supabase/seed.sql exactly so these tests double as a contract
// check on the seed data's shape.
const CONFIG: PricingConfigInput = {
  wasteFactor: 1.15,
  marginPct: 0.18,
  minMarginCents: 500,
  assemblyFeeCents: 300,
  baseLedFeeCents: 1200,
  minPriceCents: 1500,
  roundingStepCents: 100,
  minDimMm: 50,
  maxDimMm: 1000,
}

const RATES: MaterialRate[] = [
  { material: 'acrylic_clear', thicknessMm: 3, costPerM2Cents: 1800, cutCostPerMCents: 150 },
  { material: 'acrylic_clear', thicknessMm: 4, costPerM2Cents: 2300, cutCostPerMCents: 170 },
  { material: 'acrylic_clear', thicknessMm: 5, costPerM2Cents: 2900, cutCostPerMCents: 190 },
  { material: 'acrylic_black', thicknessMm: 3, costPerM2Cents: 2100, cutCostPerMCents: 150 },
  { material: 'acrylic_black', thicknessMm: 4, costPerM2Cents: 2600, cutCostPerMCents: 170 },
  { material: 'acrylic_black', thicknessMm: 5, costPerM2Cents: 3200, cutCostPerMCents: 190 },
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
  it('floors a tiny box at the configured minimum price', () => {
    const result = calculatePrice(
      { lengthMm: 100, widthMm: 80, heightMm: 60, baseType: 'none' },
      CONFIG,
      RATES
    )
    expect(result.thicknessMm).toBe(3)
    expect(result.breakdown.baseMaterialCents).toBe(0)
    expect(result.priceCents).toBe(1500)
  })

  it('prices a mid-size box with a clear acrylic base', () => {
    const result = calculatePrice(
      { lengthMm: 300, widthMm: 200, heightMm: 250, baseType: 'acrylic_clear' },
      CONFIG,
      RATES
    )
    expect(result.thicknessMm).toBe(3)
    expect(result.breakdown.baseAreaM2).toBeCloseTo(0.06, 5)
    expect(result.priceCents).toBe(2500)
  })

  it('prices a large box with an LED base, including the flat LED fee', () => {
    const result = calculatePrice(
      { lengthMm: 700, widthMm: 400, heightMm: 350, baseType: 'led' },
      CONFIG,
      RATES
    )
    expect(result.thicknessMm).toBe(5)
    expect(result.breakdown.ledFeeCents).toBe(1200)
    expect(result.priceCents).toBe(9800)
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
