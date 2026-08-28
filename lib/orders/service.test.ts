import { describe, expect, it } from 'vitest'

import { shippingMethodForQuotes } from './service'

// Only shipping_method is read, so these stand in for full Quote rows.
const standard = { shipping_method: 'standard' }
const freight = { shipping_method: 'oversized_freight' }

describe('shippingMethodForQuotes', () => {
  it('keeps a single normal box on standard shipping', () => {
    expect(shippingMethodForQuotes([standard])).toBe('standard')
  })

  it('marks a single oversized box as freight', () => {
    expect(shippingMethodForQuotes([freight])).toBe('oversized_freight')
  })

  it('escalates a mixed cart to freight — one long panel sets the shipment', () => {
    expect(shippingMethodForQuotes([standard, freight, standard])).toBe('oversized_freight')
  })

  it('stays standard when every line is standard', () => {
    expect(shippingMethodForQuotes([standard, standard, standard])).toBe('standard')
  })

  it('defaults an empty cart to standard rather than throwing', () => {
    expect(shippingMethodForQuotes([])).toBe('standard')
  })
})
