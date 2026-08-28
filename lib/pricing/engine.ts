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
  /** Longest-dimension line above which a box is oversized: 6mm walls, freight, structural warning. */
  oversizeThresholdMm: number
}

export type ShippingMethod = 'standard' | 'oversized_freight'

export interface SpanAssessment {
  longestMm: number
  /** Over oversizeThresholdMm: still quoted automatically, but freight-shipped and warned about. */
  isOversize: boolean
  /** Over maxDimMm: not quotable automatically at all. */
  requiresCustomQuote: boolean
  shippingMethod: ShippingMethod
}

export interface MaterialRate {
  material: Material
  thicknessMm: number
  costPerM2Cents: number
  cutCostPerMCents: number
}

export interface PriceBreakdown {
  thicknessMm: number
  longestDimensionMm: number
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
  shippingMethod: ShippingMethod
  /** True when the box is over the oversize threshold — drives the structural warning UI. */
  oversize: boolean
  breakdown: PriceBreakdown
}

/**
 * Why a set of dimensions was refused. The calculator branches on this: only
 * DIMENSION_REQUIRES_CUSTOM_QUOTE swaps the order button for the custom
 * engineered quote CTA — everything else is an ordinary "fix your input"
 * error, so a plain message is enough.
 */
export type PricingValidationCode =
  | 'DIMENSION_INVALID'
  | 'DIMENSION_BELOW_MIN'
  | 'DIMENSION_REQUIRES_CUSTOM_QUOTE'
  | 'MATERIAL_RATE_MISSING'

export class PricingValidationError extends Error {
  readonly code: PricingValidationCode
  /** The limit that was breached, when there is a single meaningful one — so the UI can name it. */
  readonly limitMm?: number

  constructor(
    message: string,
    code: PricingValidationCode = 'DIMENSION_INVALID',
    limitMm?: number
  ) {
    super(message)
    this.name = 'PricingValidationError'
    this.code = code
    this.limitMm = limitMm
  }
}

/**
 * Case wall thickness by longest dimension. A structural rule of thumb:
 * larger panels need more rigidity to avoid bowing. Not DB-configurable —
 * edit here if the workshop's material capabilities change.
 *
 * The 6mm tier is the oversized one. It starts at the same 1000mm line as
 * pricing_config.oversize_threshold_mm, which is what drives the freight flag
 * and the structural warning in the calculator — but the two are deliberately
 * separate knobs: this table is a workshop capability, that column is a
 * commercial policy. If the threshold is ever moved, move the tier with it.
 */
const THICKNESS_TIERS: { maxMm: number; thicknessMm: number }[] = [
  { maxMm: 300, thicknessMm: 3 },
  { maxMm: 600, thicknessMm: 4 },
  { maxMm: 1000, thicknessMm: 5 },
  { maxMm: Infinity, thicknessMm: 6 },
]

export function longestDimensionMm(dims: Dimensions): number {
  return Math.max(dims.lengthMm, dims.widthMm, dims.heightMm)
}

export function selectThicknessMm(dims: Dimensions): number {
  const longest = longestDimensionMm(dims)
  const tier = THICKNESS_TIERS.find((t) => longest <= t.maxMm)
  return (tier ?? THICKNESS_TIERS[THICKNESS_TIERS.length - 1]).thicknessMm
}

/**
 * Where a box falls against the two size lines that matter commercially:
 * `oversizeThresholdMm` (automated, but heavy-duty acrylic + freight + a
 * structural warning) and `maxDimMm` (not automated at all — the calculator
 * offers a custom engineered quote instead). Pure and side-effect free so the
 * API route can report it alongside a price and the UI can render off it
 * without re-deriving thresholds client-side.
 */
export function evaluateSpan(dims: Dimensions, config: PricingConfigInput): SpanAssessment {
  const longestMm = longestDimensionMm(dims)
  return {
    longestMm,
    isOversize: longestMm > config.oversizeThresholdMm,
    requiresCustomQuote: longestMm > config.maxDimMm,
    shippingMethod: longestMm > config.oversizeThresholdMm ? 'oversized_freight' : 'standard',
  }
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
      `No active material rate for ${material} at ${thicknessMm}mm. Add one to material_costs.`,
      'MATERIAL_RATE_MISSING'
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

/**
 * Two-sided size gate. Below minDimMm and above maxDimMm are both refusals,
 * but they are not the same kind of refusal: undersized is a typo to correct,
 * oversized past the ceiling is a real box the workshop can build — just not
 * one this engine may price unattended. The distinct code is what lets the
 * calculator offer a custom engineered quote rather than a dead end.
 *
 * Note that the 1001-1500mm band is deliberately NOT refused here: it prices
 * automatically, at 6mm, freight-flagged and warned about in the UI.
 */
export function validateDimensions(dims: Dimensions, config: PricingConfigInput): void {
  const { lengthMm, widthMm, heightMm } = dims
  for (const [label, value] of [
    ['length', lengthMm],
    ['width', widthMm],
    ['height', heightMm],
  ] as const) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new PricingValidationError(`${label} must be a positive number.`, 'DIMENSION_INVALID')
    }
    if (value < config.minDimMm) {
      throw new PricingValidationError(
        `${label} must be at least ${config.minDimMm}mm (got ${value}mm).`,
        'DIMENSION_BELOW_MIN',
        config.minDimMm
      )
    }
    if (value > config.maxDimMm) {
      throw new PricingValidationError(
        `${label} of ${value}mm is past the ${config.maxDimMm}mm limit for an automated quote. ` +
          'A case this size needs an engineered design review.',
        'DIMENSION_REQUIRES_CUSTOM_QUOTE',
        config.maxDimMm
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
  const span = evaluateSpan(input, config)
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
    shippingMethod: span.shippingMethod,
    oversize: span.isOversize,
    breakdown: {
      thicknessMm,
      longestDimensionMm: span.longestMm,
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
