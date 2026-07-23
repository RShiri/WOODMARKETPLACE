'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n/locale-context'
import { BASE_TYPE_VALUES } from '@/lib/pricing/base-types'
import type { BaseType } from '@/lib/pricing/engine'

export function BaseTypePicker({
  value,
  onChange,
}: {
  value: BaseType
  onChange: (value: BaseType) => void
}) {
  const { dict } = useLocale()

  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as BaseType)}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {BASE_TYPE_VALUES.map((option) => (
        <Label
          key={option}
          htmlFor={`base-${option}`}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent',
            value === option && 'border-primary bg-accent'
          )}
        >
          <RadioGroupItem value={option} id={`base-${option}`} className="mt-0.5" />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{dict.baseTypes[option].label}</span>
            <span className="text-xs text-muted-foreground">{dict.baseTypes[option].description}</span>
          </span>
        </Label>
      ))}
    </RadioGroup>
  )
}
