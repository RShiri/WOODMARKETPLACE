'use client'

import { tf } from '@/lib/i18n/format'
import { useLocale } from '@/lib/i18n/locale-context'

/**
 * Soft advisory shown alongside the price when a box crosses the oversize
 * threshold. Deliberately not an error: the box is quotable and orderable,
 * it just ships freight and wants a conversation about reinforcement.
 *
 * Laid out with flex rather than the shared <Alert>, whose icon slot is
 * positioned with physical `left-4`/`pl-7` and lands on the wrong side under
 * dir="rtl" — this component renders in both directions. The warning glyph is
 * a sibling element rather than part of the translated string so it can't
 * open a Hebrew paragraph with a direction-neutral character.
 */
export function StructuralWarning({
  thicknessMm,
  thresholdMm,
}: {
  thicknessMm: number
  thresholdMm: number
}) {
  const { dict } = useLocale()

  return (
    <div
      role="status"
      className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <span aria-hidden="true" className="shrink-0 leading-relaxed">
        ⚠️
      </span>
      <p className="text-xs leading-relaxed">
        {tf(dict.calculator.structuralWarning, {
          thickness: thicknessMm,
          span: Math.round(thresholdMm / 10),
        })}
      </p>
    </div>
  )
}
