import { cookies } from 'next/headers'

import { LOCALE_COOKIE } from './config'
import { getDictionary } from './dictionaries'
import { DEFAULT_LOCALE, LOCALES, type Dictionary, type Locale } from './types'

/** Reads the active locale from the request's cookies. Server Components only. */
export function getServerLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value
  return (LOCALES as string[]).includes(value ?? '') ? (value as Locale) : DEFAULT_LOCALE
}

export function getServerDictionary(): Dictionary {
  return getDictionary(getServerLocale())
}
