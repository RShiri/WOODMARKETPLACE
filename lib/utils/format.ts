// Formatting locale per currency — e.g. ILS renders with ₪ on the correct
// side and Hebrew-appropriate digit grouping under 'he-IL', which plain
// 'en-US' formatting gets subtly wrong (symbol placement, grouping).
const CURRENCY_LOCALE: Record<string, string> = {
  ils: 'he-IL',
  usd: 'en-US',
}

export function formatPrice(cents: number, currency: string = 'ils'): string {
  const normalized = currency.toLowerCase()
  const locale = CURRENCY_LOCALE[normalized] ?? 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: normalized.toUpperCase(),
  }).format(cents / 100)
}

/** e.g. 305 -> "30.5 cm" — dimensions are stored/priced in mm, shown in cm for readability. */
export function formatMmAsCm(mm: number): string {
  return `${(mm / 10).toFixed(1)} cm`
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

/** Slugifies text and appends a short unique suffix derived from an id, to keep collisions practically impossible without requiring a global-uniqueness DB constraint. */
export function slugify(text: string, uniqueSuffixSource?: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  if (!uniqueSuffixSource) return base || 'item'

  const suffix = uniqueSuffixSource.replace(/-/g, '').slice(0, 6)
  return `${base || 'item'}-${suffix}`
}
