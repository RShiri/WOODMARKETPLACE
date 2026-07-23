import type { Dictionary, Locale } from '../types'
import { en } from './en'
import { he } from './he'

export const dictionaries: Record<Locale, Dictionary> = { en, he }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}
