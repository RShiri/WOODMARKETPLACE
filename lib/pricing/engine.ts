/**
 * Pure pricing engine — no I/O, no Supabase, no Next.js. Called by
 * POST /api/quote (web calculator) and lib/bot (WhatsApp) so every channel
 * prices a box identically. Callers fetch pricing_config/material_costs
 * from the database and pass them in.
 */

export type BaseType = 'none' | 'acrylic_clear' | 'acrylic_black' | 'led'
export type Material = 'acrylic_clear' | 'acrylic_black' | 'acrylic_frosted'

export interface Dimensions {
  lengthMm: number
  widthMm: number
  heightMm: number
}

export interface CalculatePriceInput extends Dimensions {
  baseType: BaseType
}

export interface PricingConfigInput {
  wasteFactor: number
  marginPct: number
  minMarginCents: number
  assemblyFeeCents: number
  baseLedFeeCents: number
  minPriceCents: number
  roundingStepCents: number
  minDimMm: number
  maxDimMm: number
}

export interface MaterialRate {
  material: Material
  thicknessMm: number
  costPerM2Cents: number
  cutCostPerMCents: number
}

export interface PriceBreakdown {
  thicknessMm: number
  hoodAreaM2: number
  hoodMaterialCents: number
  baseAreaM2: number
  baseMaterialCents: number
  ledFeeCents: number
  cutLengthM: number
  cutCostCents: number
  assemblyFeeCents: number
  subtotalCents: number
  marginCents: number
  preRoundingCents: number
  priceCents: number
}

export interface CalculatePriceResult {
  priceCents: number
  thicknessMm: number
  breakdown: PriceBreakdown
}

export class PricingValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PricingValidationError'
  }
}

/**
 * Case wall thickness by longest dimension. A structural rule of thumb:
 * larger panels need more rigidity to avoid bowing. Not DB-configurable —
 * edit here if the workshop's material capabilities change.
 */
const THICKNESS_TIERS: { maxMm: number; thicknessMm: number }[] = [
  { maxMm: 300, thicknessMm: 3 },
  { maxMm: 600, thicknessMm: 4 },
  { maxMm: Infinity, thicknessMm: 5 },
]

export function selectThicknessMm(dims: Dimensions): number {
  const longest = Math.max(dims.lengthMm, dims.widthMm, dims.heightMm)
  const tier = THICKNESS_TIERS.find((t) => longest <= t.maxMm)
  return (tier ?? THICKNESS_TIERS[THICKNESS_TIERS.length - 1]).thicknessMm
}

function mmToM(mm: number): number {
  return mm / 1000
}

function roundUpToStep(cents: number, stepCents: number): number {
  return Math.ceil(cents / stepCents) * stepCents
}

function findRate(rates: MaterialRate[], material: Material, thicknessMm: number): MaterialRate {
  const rate = rates.find((r) => r.material === material && r.thicknessMm === thicknessMm)
  if (!rate) {
    throw new PricingValidationError(
      `No active material rate for ${material} at ${thicknessMm}mm. Add one to material_costs.`
    )
  }
  return rate
}

/** The base_type -> physical material used for the base plinth panel. */
function baseMaterialFor(baseType: BaseType): Material | null {
  switch (baseType) {
    case 'none':
      return null
    case 'acrylic_clear':
      return 'acrylic_clear'
    case 'acrylic_black':
      return 'acrylic_black'
    case 'led':
      return 'acrylic_black'
  }
}

export function validateDimensions(dims: Dimensions, config: PricingConfigInput): void {
  const { lengthMm, widthMm, heightMm } = dims
  for (const [label, value] of [
    ['length', lengthMm],
    ['width', widthMm],
    ['height', heightMm],
  ] as const) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new PricingValidationError(`${label} must be a positive number.`)
    }
    if (value < config.minDimMm || value > config.maxDimMm) {
      throw new PricingValidationError(
        `${label} must be between ${config.minDimMm}mm and ${config.maxDimMm}mm (got ${value}mm).`
      )
    }
  }
}

/**
 * Calculates the price for an open-bottom acrylic "hood" case (2 side panels
 * L×H, 2 side panels W×H, 1 top panel L×W) sized to fit over a LEGO build,
 * plus an optional base plinth (footprint L×W) selected via `baseType`.
 */
export function calculatePrice(
  input: CalculatePriceInput,
  config: PricingConfigInput,
  materialRates: MaterialRate[]
): CalculatePriceResult {
  validateDimensions(input, config)

  const { lengthMm: L, widthMm: W, heightMm: H, baseType } = input
  const thicknessMm = selectThicknessMm(input)
  const hoodRate = findRate(materialRates, 'acrylic_clear', thicknessMm)

  // Panel areas (mm² -> m²)
  const hoodAreaMm2 = 2 * (L * H) + 2 * (W * H) + L * W
  const hoodAreaM2 = hoodAreaMm2 / 1_000_000
  const hoodMaterialCents = hoodAreaM2 * hoodRate.costPerM2Cents * config.wasteFactor

  const baseMaterial = baseMaterialFor(baseType)
  let baseAreaM2 = 0
  let baseMaterialCents = 0
  let ledFeeCents = 0
  if (baseMaterial) {
    const baseRate = findRate(materialRates, baseMaterial, thicknessMm)
    baseAreaM2 = (L * W) / 1_000_000
    baseMaterialCents = baseAreaM2 * baseRate.costPerM2Cents * config.wasteFactor
  }
  if (baseType === 'led') {
    ledFeeCents = config.baseLedFeeCents
  }

  // Cut length: sum of each panel's own perimeter (every panel is cut as an
  // individual flat piece, so shared 3D edges are NOT deduplicated).
  const hoodCutLengthMm = 2 * (2 * (L + H)) + 2 * (2 * (W + H)) + 2 * (L + W)
  const baseCutLengthMm = baseMaterial ? 2 * (L + W) : 0
  const cutLengthM = mmToM(hoodCutLengthMm + baseCutLengthMm)
  const cutCostCents = cutLengthM * hoodRate.cutCostPerMCents

  const subtotalCents =
    hoodMaterialCents + baseMaterialCents + ledFeeCents + cutCostCents + config.assemblyFeeCents

  const marginCents = Math.max(subtotalCents * config.marginPct, config.minMarginCents)
  const preRoundingCents = subtotalCents + marginCents
  const priceCents = Math.max(
    roundUpToStep(preRoundingCents, config.roundingStepCents),
    config.minPriceCents
  )

  return {
    priceCents: Math.round(priceCents),
    thicknessMm,
    breakdown: {
      thicknessMm,
      hoodAreaM2,
      hoodMaterialCents: Math.round(hoodMaterialCents),
      baseAreaM2,
      baseMaterialCents: Math.round(baseMaterialCents),
      ledFeeCents,
      cutLengthM,
      cutCostCents: Math.round(cutCostCents),
      assemblyFeeCents: config.assemblyFeeCents,
      subtotalCents: Math.round(subtotalCents),
      marginCents: Math.round(marginCents),
      preRoundingCents: Math.round(preRoundingCents),
      priceCents: Math.round(priceCents),
    },
  }
}
