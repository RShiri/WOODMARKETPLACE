import { createAdminClient } from '@/lib/supabase/admin'

import type { MaterialRate, PricingConfigInput } from './engine'

export interface PricingContext {
  config: PricingConfigInput
  rates: MaterialRate[]
}

/**
 * Loads the current pricing_config singleton and all active material_costs
 * rows, mapped into the shapes lib/pricing/engine.ts expects. Called by
 * every code path that needs a live price (POST /api/quote, the WhatsApp
 * bot) so a change to pricing_config takes effect everywhere immediately.
 */
export async function loadPricingContext(): Promise<PricingContext> {
  const supabase = createAdminClient()

  const [{ data: configRow, error: configError }, { data: rateRows, error: ratesError }] =
    await Promise.all([
      supabase.from('pricing_config').select('*').eq('id', 1).single(),
      supabase.from('material_costs').select('*').eq('active', true),
    ])

  if (configError || !configRow) {
    throw new Error('pricing_config is not seeded — run supabase/seed.sql.')
  }
  if (ratesError) {
    throw new Error(`Could not load material_costs: ${ratesError.message}`)
  }

  // When a (material, thickness) pair has multiple effective_from rows,
  // keep only the most recently effective one per pair.
  const latestByKey = new Map<string, (typeof rateRows)[number]>()
  for (const row of rateRows ?? []) {
    const key = `${row.material}:${row.thickness_mm}`
    const existing = latestByKey.get(key)
    if (!existing || row.effective_from > existing.effective_from) {
      latestByKey.set(key, row)
    }
  }

  const rates: MaterialRate[] = Array.from(latestByKey.values()).map((row) => ({
    material: row.material as MaterialRate['material'],
    thicknessMm: row.thickness_mm,
    costPerM2Cents: row.cost_per_m2_cents,
    cutCostPerMCents: row.cut_cost_per_m_cents,
  }))

  const config: PricingConfigInput = {
    wasteFactor: Number(configRow.waste_factor),
    marginPct: Number(configRow.margin_pct),
    minMarginCents: configRow.min_margin_cents,
    assemblyFeeCents: configRow.assembly_fee_cents,
    baseLedFeeCents: configRow.base_led_fee_cents,
    minPriceCents: configRow.min_price_cents,
    roundingStepCents: configRow.rounding_step_cents,
    minDimMm: configRow.min_dim_mm,
    maxDimMm: configRow.max_dim_mm,
  }

  return { config, rates }
}
