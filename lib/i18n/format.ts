/** Interpolates "{key}" placeholders in a dictionary string, e.g. t('{count} pieces', { count: 9090 }). */
export function tf(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  )
}
