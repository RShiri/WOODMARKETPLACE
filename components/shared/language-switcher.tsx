'use client'

import { Languages } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useLocale } from '@/lib/i18n/locale-context'

export function LanguageSwitcher() {
  const { locale, dict, setLocale } = useLocale()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === 'en' ? 'he' : 'en')}
      aria-label="Switch language"
    >
      <Languages className="h-4 w-4" />
      <span className="ms-1.5">{dict.common.languageSwitcherLabel}</span>
    </Button>
  )
}
