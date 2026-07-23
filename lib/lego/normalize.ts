/**
 * Normalizes user-entered LEGO set identifiers into the canonical
 * "<setNumber>-<variant>" form used as the lego_sets_cache primary key
 * (e.g. "10294", "#10294", "10294-1" all normalize to "10294-1").
 * Returns null for anything that doesn't look like a set number.
 */
export function normalizeSetId(raw: string): string | null {
  const trimmed = raw.trim().replace(/^#/, '')
  const match = trimmed.match(/^(\d{3,7})(?:-(\d{1,2}))?$/)
  if (!match) return null
  const [, setNumber, variant] = match
  return `${setNumber}-${variant ?? '1'}`
}
