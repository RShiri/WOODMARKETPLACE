export function formatPrice(cents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
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
