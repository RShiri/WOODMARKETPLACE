import { normalizeSetId } from '@/lib/lego/normalize'
import type { BaseType } from '@/lib/pricing/engine'

export interface ParsedDimensions {
  lengthMm: number
  widthMm: number
  heightMm: number
}

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`

// "L30 W20 H25", "l:30, w:20, h:25" — labeled axes, any order-independent but
// written L-then-W-then-H (the overwhelmingly common way people type it).
const LABELED_PATTERN = new RegExp(
  String.raw`l(?:ength)?\s*[:=]?\s*${NUMBER}.{0,6}?w(?:idth)?\s*[:=]?\s*${NUMBER}.{0,6}?h(?:eight)?\s*[:=]?\s*${NUMBER}`,
  'i'
)

// "30x20x25", "30 x 20 x 25", "30*20*25", "30,20,25"
const TRIPLE_PATTERN = new RegExp(
  String.raw`${NUMBER}\s*[x×*]\s*${NUMBER}\s*[x×*]\s*${NUMBER}`,
  'i'
)

function parseNumber(raw: string): number {
  return Number.parseFloat(raw.replace(',', '.'))
}

/**
 * Parses free-text dimensions from a WhatsApp message. Values are assumed
 * to be centimeters unless every value exceeds 120 (implausible as cm for a
 * display box) or the message explicitly says "mm", in which case all three
 * are treated as millimeters — matching how people actually type box sizes.
 */
export function parseDimensions(text: string): ParsedDimensions | null {
  const match = text.match(LABELED_PATTERN) ?? text.match(TRIPLE_PATTERN)
  if (!match) return null

  const [, a, b, c] = match
  const values = [a, b, c].map(parseNumber)
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) return null

  const explicitMm = /\bmm\b/i.test(text)
  const explicitCm = /\bcm\b/i.test(text)
  const looksLikeMm = !explicitCm && (explicitMm || values.every((v) => v > 120))

  const [lengthMm, widthMm, heightMm] = looksLikeMm ? values : values.map((v) => v * 10)

  return {
    lengthMm: Math.round(lengthMm),
    widthMm: Math.round(widthMm),
    heightMm: Math.round(heightMm),
  }
}

/** Scans whitespace-separated tokens for one that normalizes to a set id. */
export function parseSetIdToken(text: string): string | null {
  const tokens = text.split(/\s+/)
  for (const token of tokens) {
    const cleaned = token.replace(/^[^\d#]+|[^\d]+$/g, '')
    const normalized = normalizeSetId(cleaned)
    if (normalized) return normalized
  }
  return null
}

const BASE_CHOICE_MAP: Record<string, BaseType> = {
  '1': 'none',
  none: 'none',
  no: 'none',
  '2': 'acrylic_clear',
  clear: 'acrylic_clear',
  acrylic: 'acrylic_clear',
  '3': 'acrylic_black',
  black: 'acrylic_black',
  '4': 'led',
  led: 'led',
  light: 'led',
}

export function parseBaseChoice(text: string): BaseType | null {
  const normalized = text.trim().toLowerCase()
  return BASE_CHOICE_MAP[normalized] ?? null
}

export function parseYesNo(text: string): 'yes' | 'no' | null {
  const normalized = text.trim().toLowerCase()
  if (['yes', 'y', 'yep', 'yeah', 'correct', 'confirm'].includes(normalized)) return 'yes'
  if (['no', 'n', 'nope', 'edit', 'change'].includes(normalized)) return 'no'
  return null
}
