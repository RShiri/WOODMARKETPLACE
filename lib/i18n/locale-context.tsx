'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DirectionProvider } from '@radix-ui/react-direction'

import { LOCALE_COOKIE } from './config'
import { getDictionary } from './dictionaries'
import { DEFAULT_LOCALE, isRtl, type Dictionary, type Locale } from './types'

interface LocaleContextValue {
  locale: Locale
  dict: Dictionary
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

/**
 * Client-side locale state, seeded from the server-rendered locale (read
 * from the cookie in app/layout.tsx) so there's no hydration mismatch or
 * language flash on load. Switching locale updates the cookie, flips
 * <html lang/dir>, and refreshes so Server Components (which read the same
 * cookie independently — see lib/i18n/server.ts) re-render translated too.
 */
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale
  children: React.ReactNode
}) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE)

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next)
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`
      document.documentElement.lang = next
      document.documentElement.dir = isRtl(next) ? 'rtl' : 'ltr'
      router.refresh()
    },
    [router]
  )

  const value = useMemo(() => ({ locale, dict: getDictionary(locale), setLocale }), [locale, setLocale])

  return (
    <LocaleContext.Provider value={value}>
      {/* Radix primitives (Tabs, RadioGroup, Select, ...) read direction from
          this context for keyboard nav and internal layout — they do NOT
          just inherit the ambient <html dir>, so without this they silently
          stay left-to-right even on a fully RTL page. */}
      <DirectionProvider dir={isRtl(locale) ? 'rtl' : 'ltr'}>{children}</DirectionProvider>
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider')
  return ctx
}
