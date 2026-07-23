'use client'

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { BASE_TYPE_OPTIONS } from '@/lib/pricing/base-types'
import type { BaseType } from '@/lib/pricing/engine'

export function BaseTypePicker({
  value,
  onChange,
}: {
  value: BaseType
  onChange: (value: BaseType) => void
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as BaseType)}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {BASE_TYPE_OPTIONS.map((option) => (
        <Label
          key={option.value}
          htmlFor={`base-${option.value}`}
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent',
            value === option.value && 'border-primary bg-accent'
          )}
        >
          <RadioGroupItem value={option.value} id={`base-${option.value}`} className="mt-0.5" />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{option.label}</span>
            <span className="text-xs text-muted-foreground">{option.description}</span>
          </span>
        </Label>
      ))}
    </RadioGroup>
  )
}
