import type { BaseType } from './engine'

export const BASE_TYPE_OPTIONS: { value: BaseType; label: string; description: string }[] = [
  { value: 'none', label: 'No base', description: 'Just the clear hood — rests on your own shelf.' },
  { value: 'acrylic_clear', label: 'Clear base', description: 'Matching clear acrylic display base.' },
  { value: 'acrylic_black', label: 'Black base', description: 'Black acrylic base for contrast.' },
  { value: 'led', label: 'LED base', description: 'Black acrylic base with built-in LED lighting.' },
]

export function baseTypeLabel(value: string): string {
  return BASE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value
}
